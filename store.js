// Mape Corrections – accès aux données (Firebase ou mode démo local)
import { FIREBASE_CONFIG, CODE_ACCES, CODE_MANAGER } from './config.js';
const managerOk = c => (c || '').trim().toUpperCase() === CODE_MANAGER.toUpperCase();

export const slug = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// Clé de nom : insensible aux accents, à la casse et à l'ordre prénom/nom
export const nameKey = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).sort().join(' ');

const ERR = {
  'auth/email-already-in-use': 'Un compte existe déjà avec ce prénom et ce nom.',
  'auth/invalid-credential': 'Nom ou mot de passe incorrect.',
  'auth/wrong-password': 'Nom ou mot de passe incorrect.',
  'auth/user-not-found': 'Aucun compte avec ce prénom et ce nom.',
  'auth/weak-password': 'Mot de passe trop court (6 caractères minimum).',
  'auth/network-request-failed': 'Pas de réseau : la connexion nécessite internet la première fois.',
  'auth/too-many-requests': 'Trop d\'essais. Réessayez dans quelques minutes.',
  'permission-denied': 'Code d\'accès incorrect.',
  'bad-manager-code': 'Code manager incorrect.',
  'bad-codes': 'Code d\'accès ou code manager incorrect.',
  'rules-denied': 'La base Firebase refuse l\'accès : règles non publiées ou incorrectes.',
  'needs-new-password': 'Votre mot de passe a été réinitialisé.'
};
export const errMsg = e => ERR[e && e.code] || (e && e.message) || 'Erreur inconnue';

const PROFILE_CACHE = 'mc_profile';
const cacheProfile = p => { try { p ? localStorage.setItem(PROFILE_CACHE, JSON.stringify(p)) : localStorage.removeItem(PROFILE_CACHE); } catch (e) {} };
const clean = x => { delete x.code; delete x.codeManager; return x; };
const fail = code => { const e = new Error(ERR[code]); e.code = code; throw e; };
const cachedProfile = uid => { try { const p = JSON.parse(localStorage.getItem(PROFILE_CACHE)); return p && p.uid === uid ? p : null; } catch (e) { return null; } };

export async function createStore() {
  return FIREBASE_CONFIG ? firebaseStore() : demoStore();
}

// ───────────────────────── Firebase ─────────────────────────
// Organisation :
//  names/{nid}  nid = empreinte du nom (lecture publique, ne contient pas le nom)
//               { uid, gen, role, reset, deleted } → relie un nom au compte actif.
//               Réinitialiser / supprimer = le manager passe gen+1 et reset:true ;
//               l'ancien compte perd aussitôt l'accès (règles), la personne recrée
//               son mot de passe sur un nouveau compte (gen+1), ses fiches restent.
//  users/{uid}  profil { prenom, nom, nameKey, nid, role, reset? }
//  fiches/{id}
async function firebaseStore() {
  const F = await import('./firebase.js');
  const app = F.initializeApp(FIREBASE_CONFIG);
  const auth = F.getAuth(app);
  const db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
  const nidOf = async k => { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mape:' + k)); return [...new Uint8Array(h)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join(''); };
  const email = (k, gen) => `${slug(k)}.${gen}@mape-corrections.app`;
  let pendingProfile = null, authCb = () => {}, creating = false;

  async function lookup(prenom, nom) {
    const k = nameKey(prenom + ' ' + nom), nid = await nidOf(k);
    let s;
    try { s = await F.getDoc(F.doc(db, 'names', nid)); }
    catch (e) { if (!navigator.onLine) fail('auth/network-request-failed'); if (e.code === 'permission-denied') fail('rules-denied'); throw e; }
    return { k, nid, n: s.exists() ? s.data() : null };
  }

  async function loadProfile(u) {
    if (pendingProfile && pendingProfile.uid === u.uid) return pendingProfile;
    for (let i = 0; i < 4; i++) {
      try {
        const s = await F.getDoc(F.doc(db, 'users', u.uid));
        if (s.exists() && !s.data().reset) { const p = clean({ uid: u.uid, ...s.data() }); cacheProfile(p); return p; }
        if (s.exists() && s.data().reset) return null;
      } catch (e) { const c = cachedProfile(u.uid); if (c) return c; }
      await new Promise(r => setTimeout(r, 700));
    }
    return null;
  }

  // Crée le compte Firebase + profil + lien du nom, en une seule écriture
  async function createAccount({ prenom, nom, password, role, k, nid, n, extra }) {
    const gen = n ? n.gen : 0;
    creating = true;
    try { return await doCreate(); } finally { creating = false; }
    async function doCreate() {
    const cred = await F.createUserWithEmailAndPassword(auth, email(k, gen), password);
    const uid = cred.user.uid;
    const prof = { prenom, nom, nameKey: k, nid, role, createdAt: Date.now() };
    const b = F.writeBatch(db);
    b.set(F.doc(db, 'users', uid), { ...prof, ...extra });
    if (n) {
      b.update(F.doc(db, 'names', nid), { uid, reset: false, deleted: false, role });
      if (n.oldUid) b.delete(F.doc(db, 'users', n.oldUid));
    } else b.set(F.doc(db, 'names', nid), { uid, gen: 0, role, reset: false, deleted: false });
    try { await b.commit(); }
    catch (e) { try { await F.deleteUser(cred.user); } catch (_) {} throw e; }
    pendingProfile = { uid, ...prof };
    cacheProfile(pendingProfile); authCb(pendingProfile);
    return pendingProfile;
    }
  }

  return {
    mode: 'firebase',
    onAuth(cb) {
      authCb = cb;
      F.onAuthStateChanged(auth, async u => {
        if (!u) { if (!creating) { cacheProfile(null); cb(null); } return; }
        if (creating) return; // createAccount appelle lui-même authCb
        const c = cachedProfile(u.uid); if (c) cb(c);
        const p = await loadProfile(u);
        if (p) cb(p); else if (!creating) { cacheProfile(null); await F.signOut(auth); }
      });
    },
    async signUp({ prenom, nom, password, role, code, codeManager }) {
      const { k, nid, n } = await lookup(prenom, nom);
      if (n && !n.reset) fail('auth/email-already-in-use');
      if (n && n.reset && !n.deleted) fail('needs-new-password');
      if (role === 'manager' && !(codeManager || '').trim()) fail('bad-manager-code');
      try {
        return await createAccount({ prenom, nom, password, role, k, nid, n: n && { ...n, oldUid: null }, extra: { code, codeManager: role === 'manager' ? codeManager.trim() : '' } });
      } catch (e) {
        if (e.code === 'permission-denied') fail(role === 'manager' ? 'bad-codes' : 'permission-denied');
        throw e;
      }
    },
    // Nouveau mot de passe après réinitialisation par le manager
    async completeReset({ prenom, nom, password }) {
      const { k, nid, n } = await lookup(prenom, nom);
      if (!n || !n.reset || n.deleted) fail('auth/invalid-credential');
      return createAccount({ prenom, nom, password, role: n.role, k, nid, n: { ...n, oldUid: n.uid }, extra: {} });
    },
    async signIn({ prenom, nom, password }) {
      const { k, n } = await lookup(prenom, nom);
      if (!n || n.deleted) fail('auth/user-not-found');
      if (n.reset) fail('needs-new-password');
      await F.signInWithEmailAndPassword(auth, email(k, n.gen), password);
    },
    async signOut() { cacheProfile(null); pendingProfile = null; await F.signOut(auth); },
    async setRole(me, role, codeManager) {
      if (role === 'manager' && !(codeManager || '').trim()) fail('bad-manager-code');
      const b = F.writeBatch(db);
      b.update(F.doc(db, 'users', me.uid), { role, codeManager: role === 'manager' ? codeManager.trim() : '' });
      b.update(F.doc(db, 'names', me.nid), { role });
      try { await b.commit(); } catch (e) { if (e.code === 'permission-denied') fail('bad-manager-code'); throw e; }
      const p = { ...me, role }; cacheProfile(p); authCb(p); return p;
    },
    // Manager : réinitialiser le mot de passe d'un compte
    async resetAccount(u) {
      const s = await F.getDoc(F.doc(db, 'names', u.nid));
      const b = F.writeBatch(db);
      b.update(F.doc(db, 'names', u.nid), { gen: s.data().gen + 1, reset: true });
      b.update(F.doc(db, 'users', u.uid), { reset: true });
      await b.commit();
    },
    // Manager : supprimer un compte (les fiches sont gardées)
    async deleteAccount(u) {
      const s = await F.getDoc(F.doc(db, 'names', u.nid));
      const b = F.writeBatch(db);
      b.update(F.doc(db, 'names', u.nid), { gen: s.data().gen + 1, reset: true, deleted: true, uid: null });
      b.delete(F.doc(db, 'users', u.uid));
      await b.commit();
    },
    watch(onUsers, onFiches) {
      const u1 = F.onSnapshot(F.collection(db, 'users'), s => onUsers(s.docs.map(d => clean({ uid: d.id, ...d.data() }))), e => console.warn(e));
      const u2 = F.onSnapshot(F.collection(db, 'fiches'), { includeMetadataChanges: true }, s => onFiches(s.docs.map(d => ({ id: d.id, ...d.data(), _pending: d.metadata.hasPendingWrites }))), e => console.warn(e));
      return () => { u1(); u2(); };
    },
    async addFiches(list) {
      const b = F.writeBatch(db);
      list.forEach(f => b.set(F.doc(F.collection(db, 'fiches')), f));
      b.commit().catch(e => console.warn(e)); // hors ligne : envoyé dès le retour du réseau
    },
    async updateFiche(id, patch) { F.updateDoc(F.doc(db, 'fiches', id), patch).catch(e => console.warn(e)); },
    async deleteFiche(id) { F.deleteDoc(F.doc(db, 'fiches', id)).catch(e => console.warn(e)); }
  };
}

// ───────────────────────── Mode démo ─────────────────────────
function demoStore() {
  const K = { users: 'mc_demo_users', fiches: 'mc_demo_fiches', session: 'mc_demo_session' };
  const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  let authCb = () => {}, usersCb = () => {}, fichesCb = () => {};
  const pub = u => { const x = { ...u }; delete x.password; return x; };
  const emit = () => { usersCb(get(K.users, []).map(pub)); fichesCb(get(K.fiches, [])); };
  const me = () => { const id = get(K.session, null); const u = get(K.users, []).find(x => x.uid === id); return u ? pub(u) : null; };
  window.addEventListener('storage', () => { emit(); authCb(me()); });
  return {
    mode: 'demo',
    onAuth(cb) { authCb = cb; setTimeout(() => cb(me()), 0); },
    async signUp({ prenom, nom, password, role, code, codeManager }) {
      if (role === 'manager' && !managerOk(codeManager)) fail('bad-manager-code');
      if ((code || '').trim().toUpperCase() !== CODE_ACCES) fail('permission-denied');
      if (password.length < 6) fail('auth/weak-password');
      const users = get(K.users, []);
      const k = nameKey(prenom + ' ' + nom);
      const ex = users.find(u => u.nameKey === k);
      if (ex && ex.reset) fail('needs-new-password');
      if (ex) fail('auth/email-already-in-use');
      const u = { uid: 'u' + Date.now().toString(36), prenom, nom, nameKey: k, role, password, createdAt: Date.now() };
      users.push(u); set(K.users, users); set(K.session, u.uid);
      emit(); authCb(pub(u)); return pub(u);
    },
    async setRole(me, role, codeManager) {
      if (role === 'manager' && !managerOk(codeManager)) fail('bad-manager-code');
      const users = get(K.users, []).map(u => u.uid === me.uid ? { ...u, role } : u);
      set(K.users, users); emit(); const p = { ...me, role }; authCb(p); return p;
    },
    async signIn({ prenom, nom, password }) {
      const u = get(K.users, []).find(x => x.nameKey === nameKey(prenom + ' ' + nom));
      if (!u) fail('auth/user-not-found');
      if (u.reset) fail('needs-new-password');
      if (u.password !== password) fail('auth/invalid-credential');
      set(K.session, u.uid); authCb(pub(u));
    },
    async signOut() { set(K.session, null); authCb(null); },
    async completeReset({ prenom, nom, password }) {
      if (password.length < 6) fail('auth/weak-password');
      const k = nameKey(prenom + ' ' + nom); let me = null;
      const users = get(K.users, []).map(u => u.nameKey === k && u.reset ? (me = { ...u, password, reset: false, uid: 'u' + Date.now().toString(36) }) : u);
      if (!me) fail('auth/invalid-credential');
      set(K.users, users); set(K.session, me.uid); emit(); authCb(pub(me)); return pub(me);
    },
    async resetAccount(x) { set(K.users, get(K.users, []).map(u => u.uid === x.uid ? { ...u, reset: true, password: null } : u)); emit(); },
    async deleteAccount(x) { set(K.users, get(K.users, []).filter(u => u.uid !== x.uid)); emit(); },
    watch(onU, onF) { usersCb = onU; fichesCb = onF; emit(); return () => { usersCb = fichesCb = () => {}; }; },
    async addFiches(list) { const f = get(K.fiches, []); list.forEach(x => f.push({ id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...x })); set(K.fiches, f); emit(); },
    async updateFiche(id, patch) { set(K.fiches, get(K.fiches, []).map(x => x.id === id ? { ...x, ...patch } : x)); emit(); },
    async deleteFiche(id) { set(K.fiches, get(K.fiches, []).filter(x => x.id !== id)); emit(); }
  };
}
