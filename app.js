// Mape Corrections – application
import { createStore, nameKey, errMsg } from './store.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// ───────── Icônes & logo ─────────
const svg = (d, w = 20, sw = 2.4, extra = '') => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
const I = {
  back: svg('<path d="M15 18l-6-6 6-6"/>', 22),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>', 22),
  check: (w = 18) => svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', w, 3),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 18, 3),
  send: svg('<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>', 18),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', 18, 2.2),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 15, 2.6),
  undo: svg('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>', 18),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/>', 18, 2, 'style="flex:none;margin-top:1px"'),
  paste: svg('<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>', 18)
};
const LOGO = `<span class="brandw"><svg class="brand" role="img" aria-label="MAPE" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 302 97"><g fill="none" stroke="#8E8E92" stroke-width="11" stroke-linejoin="miter"><path d="M13.5 84.5 V19 L46 66 L78.5 19 V84.5"/><path d="M193 84.5 V19 H216 A18 18 0 0 1 216 55 H193"/><path d="M293 19 H257.5 V84.5 H293 M257.5 51 H289"/></g><svg x="88" y="13" width="80" height="72" viewBox="-2 -2 102 92"><defs><mask id="mcA"><path d="M9 78 L49 10 L89 78" fill="none" stroke="#fff" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><polygon points="49,29 27.6,66 70.4,66" fill="#fff" stroke="#fff" stroke-width="1"/></mask></defs><g mask="url(#mcA)"><polygon points="0,4.6 49,46.5 49,200 -10,200 -10,-10" fill="#203F7A"/><polygon points="100,0.2 49,46.5 49,200 110,200 110,-10" fill="#86D1B0"/><polygon points="49,46.5 0,4.6 0,-10 100,-10 100,0.2" fill="#C8204A"/><polygon points="49,46.5 30,67.5 68,67.5" fill="#F9B91F"/></g></svg></svg><span class="tick"><svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span></span>`;

// ───────── Jours ouvrés (France : sans week-ends ni jours fériés) ─────────
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    n = h + l - 7 * m + 114;
  return new Date(y, Math.floor(n / 31) - 1, (n % 31) + 1);
}
const HOL = {};
function holidays(y) {
  if (HOL[y]) return HOL[y];
  const e = easter(y), add = n => { const x = new Date(e); x.setDate(x.getDate() + n); return x; };
  return HOL[y] = new Set([new Date(y, 0, 1), add(1), new Date(y, 4, 1), new Date(y, 4, 8), add(39), add(50), new Date(y, 6, 14), new Date(y, 7, 15), new Date(y, 10, 1), new Date(y, 10, 11), new Date(y, 11, 25)].map(d => d.toDateString()));
}
const isWorkday = d => d.getDay() !== 0 && d.getDay() !== 6 && !holidays(d.getFullYear()).has(d.toDateString());
function bdays(from, to) {
  const d = new Date(from); d.setHours(0, 0, 0, 0);
  const b = new Date(to); b.setHours(0, 0, 0, 0);
  let n = 0;
  while (d < b) { d.setDate(d.getDate() + 1); if (isWorkday(d)) n++; }
  return n;
}
const jx = f => { const n = bdays(f.sentAt, Date.now()); return { n, label: n === 0 ? 'Aujourd\'hui' : 'J-' + n, late: n > 2 }; };
const pad = n => String(n).padStart(2, '0');
const fD = ms => { const d = new Date(ms); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
const fDY = ms => { const d = new Date(ms); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const fDT = ms => { const d = new Date(ms); return `${fD(ms)} à ${pad(d.getHours())}h${pad(d.getMinutes())}`; };
const plural = (n, s, p) => `${n} ${n > 1 ? (p || s + 's') : s}`;

// ───────── État ─────────
const S = {
  store: null, me: null, users: [], fiches: [], unwatch: null,
  view: { name: 'home' }, techTab: 'todo', manTab: 'techs', valFilter: 'close', q: '',
  drafts: {}, paste: '', authTab: 'login', authErr: ''
};
const isMan = () => S.me && S.me.role === 'manager';
const userByKey = k => S.users.find(u => u.nameKey === k);
const techName = (k, fallback) => { const u = userByKey(k); return u ? `${u.prenom} ${u.nom}` : (fallback || k); };
const initials = s => (s || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const fiche = id => S.fiches.find(f => f.id === id);
const errorTypes = () => [...new Set(S.fiches.flatMap(f => [f.typeErreur, f.typeErreurInitial]).filter(Boolean))].sort();
const modified = f => f.typeErreurInitial && f.typeErreur !== f.typeErreurInitial;

// ───────── Navigation ─────────
function go(view) { S.view = view; history.pushState(view, ''); render(); window.scrollTo(0, 0); }
function back() { if (history.state && history.state.name !== 'home') history.back(); else { S.view = { name: 'home' }; render(); } }
window.addEventListener('popstate', e => { closeSheet(); S.view = e.state || { name: 'home' }; render(); });

function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2400); }
function openSheet(html) { $('#sheetP').innerHTML = html; $('#sheet').classList.add('on'); }
function closeSheet() { $('#sheet').classList.remove('on'); }
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });

// ───────── Rendu ─────────
function render() {
  const act = document.activeElement, aid = act && act.id, sel = act && 'selectionStart' in act ? [act.selectionStart, act.selectionEnd] : null;
  const v = S.me ? S.view : { name: 'auth' };
  const r = (V[v.name] || V.home)(v);
  $('#hdr').hidden = !r.hdr; $('#hdr').innerHTML = r.hdr || '';
  $('#main').className = v.name === 'auth' ? 'auth' : '';
  $('#main').innerHTML = r.main;
  $('#bar').innerHTML = r.bar ? `<div class="bar"><div class="in">${r.bar}</div></div>` : (r.fab || '');
  $('#demo').hidden = !(S.store && S.store.mode === 'demo');
  if (aid) { const el = document.getElementById(aid); if (el) { el.focus(); if (sel) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) {} } }
  r.after && r.after();
}
const net = () => `<div class="net ${navigator.onLine ? '' : 'off'}" id="net"><i></i><span>${navigator.onLine ? 'En ligne' : 'Hors ligne'}</span></div>`;
const hdrHome = sub => `${LOGO}<div class="htxt"><b>Corrections</b><small>${sub}</small></div>${net()}<button class="me ${isMan() ? 'man' : ''}" data-act="profile" aria-label="Mon compte">${esc(initials(S.me.prenom + ' ' + S.me.nom))}</button>`;
const hdrSub = (title, sub, icon = I.back) => `<button class="back" data-act="back" aria-label="Retour">${icon}</button><div class="htxt" style="margin-left:0"><b>${title}</b><small>${sub || ''}</small></div>${net()}`;
window.addEventListener('online', () => { const n = $('#net'); if (n) n.outerHTML = net(); });
window.addEventListener('offline', () => { const n = $('#net'); if (n) n.outerHTML = net(); });

const pill = f => f.statut === 'validee' ? `<span class="pill ok">${I.check(13)}Validée</span>`
  : f.statut === 'cloturee' ? `<span class="pill cl">${I.check(13)}Clôturée</span>`
  : `<span class="pill ko"><i></i>${isMan() ? 'En cours' : 'À corriger'}</span>`;
const vPill = f => f.version > 1 ? `<span class="pill v">V${f.version}</span>` : '';
const title = f => `OT ${esc(f.ot)} · Test ${esc(f.test)}`;

function hl(text) {
  let h = esc(text);
  const toks = norm(S.q).split(' ').filter(t => t.length > 1);
  toks.forEach(t => { h = h.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); });
  return h;
}

const V = {};

// ───── Connexion / création de compte ─────
V.auth = () => {
  if (S.authReset) return authReset();
  const su = S.authTab === 'signup';
  return {
    main: `<div class="logo">${LOGO}</div>
    <h1>Mape Corrections</h1><p class="sub">Fiches de correction des rapports</p>
    <div class="seg"><button data-act="authTab" data-v="login" class="${su ? '' : 'on'}">Connexion</button><button data-act="authTab" data-v="signup" class="${su ? 'on' : ''}">Créer un compte</button></div>
    <form id="authForm" class="card" autocomplete="on">
      <label class="l" for="aP" style="margin-top:0">Prénom</label><input id="aP" type="text" name="given-name" autocomplete="given-name" required>
      <label class="l" for="aN">Nom</label><input id="aN" type="text" name="family-name" autocomplete="family-name" required>
      ${su ? `<div class="l">Je suis</div><div class="roles"><label><input type="radio" name="role" value="tech" checked>Technicien</label><label><input type="radio" name="role" value="manager">Manager</label></div>` : ''}
      <label class="l" for="aW">Mot de passe${su ? ' (6 caractères min.)' : ''}</label><input id="aW" type="password" autocomplete="${su ? 'new-password' : 'current-password'}" required>
      ${su ? `<div id="mgrBox" hidden><label class="l" for="aM">Code manager</label><input id="aM" type="text" autocomplete="off" placeholder="Réservé aux managers"></div>` : ''}
      ${su ? `<label class="l" for="aC">Code d'accès</label><input id="aC" type="text" autocapitalize="characters" autocomplete="off" required placeholder="Donné par votre manager">` : ''}
      <div class="err" id="aErr">${esc(S.authErr)}</div>
      <button class="btn pri" style="width:100%;margin-top:6px" type="submit">${su ? 'Créer mon compte' : 'Se connecter'}</button>
    </form>
    ${S.store && S.store.mode === 'demo' ? `<div class="info warn">${I.info}<span>Mode démo : créez un compte manager et un compte technicien pour tester, puis passez de l'un à l'autre (Se déconnecter).</span></div>` : ''}`,
    after() {
      document.querySelectorAll('input[name=role]').forEach(r => r.addEventListener('change', () => { $('#mgrBox').hidden = r.value !== 'manager' || !r.checked; }));
      $('#authForm').addEventListener('submit', async e => {
        e.preventDefault();
        const b = e.target.querySelector('button[type=submit]'); b.disabled = true;
        const cap = s => s.trim().replace(/\s+/g, ' ');
        // Prénom « Joanne », nom « BRES » (comme dans le tableau Excel)
        const prenom = cap($('#aP').value).toLowerCase().replace(/(^|[\s-])\p{L}/gu, m => m.toUpperCase());
        const d = { prenom, nom: cap($('#aN').value).toUpperCase(), password: $('#aW').value };
        try {
          if (su) await S.store.signUp({ ...d, role: (document.querySelector('input[name=role]:checked') || {}).value || 'tech', code: $('#aC').value.trim().toUpperCase(), codeManager: $('#aM').value });
          else await S.store.signIn(d);
          S.authErr = '';
        } catch (err) {
          if (err.code === 'needs-new-password') { S.authReset = { prenom: d.prenom, nom: d.nom }; S.authErr = ''; render(); return; }
          S.authErr = errMsg(err); $('#aErr').textContent = S.authErr; b.disabled = false;
        }
      });
    }
  };
};

function authReset() {
  const r = S.authReset;
  return {
    main: `<div class="logo">${LOGO}</div>
    <h1>Nouveau mot de passe</h1><p class="sub">${esc(r.prenom)} ${esc(r.nom)}</p>
    <div class="info">${I.info}<span>Votre manager a réinitialisé votre mot de passe. Choisissez-en un nouveau : vos fiches sont conservées.</span></div>
    <form id="resetForm" class="card">
      <label class="l" for="rW" style="margin-top:0">Nouveau mot de passe (6 caractères min.)</label><input id="rW" type="password" autocomplete="new-password" required>
      <label class="l" for="rW2">Confirmer le mot de passe</label><input id="rW2" type="password" autocomplete="new-password" required>
      <div class="err" id="rErr"></div>
      <button class="btn pri" style="width:100%;margin-top:6px" type="submit">Enregistrer et me connecter</button>
    </form>
    <button class="link" data-act="cancelReset">Retour à la connexion</button>`,
    after() {
      $('#resetForm').addEventListener('submit', async e => {
        e.preventDefault();
        const w = $('#rW').value, err = $('#rErr');
        if (w.length < 6) { err.textContent = errMsg({ code: 'auth/weak-password' }); return; }
        if (w !== $('#rW2').value) { err.textContent = 'Les deux mots de passe sont différents.'; return; }
        const b = e.target.querySelector('button'); b.disabled = true;
        try { await S.store.completeReset({ ...r, password: w }); S.authReset = null; }
        catch (x) { err.textContent = errMsg(x); b.disabled = false; }
      });
    }
  };
}

// ───── Accueil ─────
V.home = () => isMan() ? manHome() : techHome();

function techCard(f) {
  const j = jx(f), todo = f.statut === 'a_corriger';
  return `<button class="card ${todo && j.late ? 'late' : ''}" data-act="open" data-id="${f.id}">
    <div class="row">${pill(f)}${vPill(f)}${todo ? `<span class="jx ${j.late ? 'late' : ''}">${j.label}</span>` : `<span class="jx">le ${fD(f.validatedAt)}</span>`}</div>
    <div class="ct">${title(f)}</div>
    <div class="ce" ${todo ? '' : 'style="color:var(--muted)"'}>${esc(f.typeErreur)}${modified(f) ? ' <span class="pill mod">modifié</span>' : ''}</div>
    <div class="cm">Intervention ${esc(f.dateIntervention)} · Rejet ${esc(f.dateRejet)}</div>
  </button>`;
}
function techHome() {
  const mine = S.fiches.filter(f => f.techKey === S.me.nameKey);
  const todo = mine.filter(f => f.statut === 'a_corriger').sort((a, b) => a.sentAt - b.sentAt);
  const old = mine.filter(f => f.statut !== 'a_corriger').sort((a, b) => (b.validatedAt || 0) - (a.validatedAt || 0));
  const list = S.techTab === 'todo' ? todo : old;
  return {
    hdr: hdrHome('Fiches de correction'),
    main: `<h1>Bonjour ${esc(S.me.prenom)}</h1>
    <p class="sub">${todo.length ? plural(todo.length, 'fiche') + ' à corriger' : 'Aucune fiche à corriger'}</p>
    <div class="seg"><button data-act="techTab" data-v="todo" class="${S.techTab === 'todo' ? 'on' : ''}">À corriger · ${todo.length}</button><button data-act="techTab" data-v="old" class="${S.techTab === 'old' ? 'on' : ''}">Anciennes · ${old.length}</button></div>
    ${list.map(techCard).join('') || `<div class="empty">${S.techTab === 'todo' ? 'Rien à corriger pour le moment.' : 'Aucune ancienne fiche.'}</div>`}`
  };
}

function techList() {
  const map = new Map();
  S.users.filter(u => u.role !== 'manager').forEach(u => map.set(u.nameKey, { key: u.nameKey, name: `${u.prenom} ${u.nom}`, open: 0, close: 0, late: 0, account: true, reset: !!u.reset }));
  S.fiches.forEach(f => {
    if (!map.has(f.techKey)) map.set(f.techKey, { key: f.techKey, name: techName(f.techKey, f.tech), open: 0, close: 0, late: 0, account: !!userByKey(f.techKey) });
    const t = map.get(f.techKey);
    if (f.statut === 'a_corriger') { t.open++; if (jx(f).late) t.late++; }
    if (f.statut === 'validee') t.close++;
  });
  return [...map.values()].sort((a, b) => (b.open + b.close > 0) - (a.open + a.close > 0) || b.late - a.late || a.name.localeCompare(b.name));
}

function manHome() {
  const seg = `<div class="seg"><button data-act="manTab" data-v="techs" class="${S.manTab === 'techs' ? 'on' : ''}">Techniciens</button><button data-act="manTab" data-v="val" class="${S.manTab === 'val' ? 'on' : ''}">Rapports validés</button></div>`;
  if (S.manTab === 'val') return { hdr: hdrHome('Espace manager'), main: seg + valTab() };
  const techs = techList();
  const sum = k => techs.reduce((s, t) => s + t[k], 0);
  const rows = techs.map(t => {
    const dot = t.open ? 'ko' : t.close ? 'ok' : '';
    const parts = [];
    if (t.open) parts.push(`${t.open} en cours${t.late ? ` · dont ${t.late} en retard` : ''}`);
    if (t.close) parts.push(plural(t.close, 'validée') + ' à clôturer');
    return `<button class="li" data-act="tech" data-key="${esc(t.key)}">
      <div class="av ${dot ? '' : 'none'}">${esc(initials(t.name))}${dot ? `<em class="${dot}"></em>` : ''}</div>
      <div class="t"><b>${esc(t.name)}</b><small>${parts.join(' · ') || 'Aucune fiche en cours'}${t.account ? (t.reset ? ' · mot de passe réinitialisé' : '') : ' · pas encore de compte'}</small></div>
      ${t.open ? `<span class="cnt ko">${t.open}</span>` : t.close ? `<span class="cnt ok">${t.close}</span>` : ''}
    </button>`;
  }).join('');
  return {
    hdr: hdrHome('Espace manager'),
    main: seg + `<div class="stats"><div><b style="color:var(--ko)">${sum('open')}</b><span>En cours</span></div><div><b style="color:var(--ok)">${sum('close')}</b><span>À clôturer</span></div><div><b style="color:#9a3412">${sum('late')}</b><span>En retard</span></div></div>
      ${rows ? `<div class="list">${rows}</div>` : `<div class="empty">Aucun technicien pour l'instant.<br>Les techniciens apparaissent dès qu'ils créent leur compte ou qu'une fiche leur est envoyée.</div>`}`,
    fab: `<button class="fab" data-act="new">${I.plus}Nouvelle fiche</button>`
  };
}

function haystack(f) {
  return norm([f.ot, f.test, f.tech, techName(f.techKey, f.tech), f.typeErreur, f.typeErreurInitial, f.commentaire, f.correction, f.dateIntervention, f.dateRejet,
    f.validatedAt && fDY(f.validatedAt), 'v' + f.version, ...(f.historique || []).flatMap(h => [h.correction, h.motif])].join(' '));
}
function valCard(f) {
  const j = jx(f);
  const right = f.statut === 'a_corriger' ? `<span class="jx ${j.late ? 'late' : ''}">${j.label}</span>`
    : (() => { const n = bdays(f.sentAt, f.validatedAt); return `<span class="cm" style="margin-left:auto;${n > 2 ? 'color:#9a3412;font-weight:600' : ''}">Validée le ${fD(f.validatedAt)} · en ${n} j</span>`; })();
  return `<button class="card" data-act="open" data-id="${f.id}">
    <div class="row">${pill(f)}${vPill(f)}${right}</div>
    <div class="ct" style="font-size:16px;margin-top:6px">OT ${hl(f.ot)} · Test ${hl(f.test)}</div>
    <div class="cm">${hl(techName(f.techKey, f.tech))} · ${hl(f.typeErreur)}${modified(f) ? ' <span class="pill mod">modifié</span>' : ''}</div>
  </button>`;
}
function valResults() {
  const toks = norm(S.q).split(' ').filter(Boolean);
  let list = S.fiches.filter(f => S.valFilter === 'all' ? true : S.valFilter === 'close' ? f.statut === 'validee' : f.statut === 'cloturee');
  if (toks.length) list = list.filter(f => { const h = haystack(f); return toks.every(t => h.includes(t)); });
  list.sort((a, b) => (b.validatedAt || b.sentAt) - (a.validatedAt || a.sentAt));
  return `<div class="cm" style="margin-bottom:12px">OT, n° de test, technicien, type d'erreur, commentaire, correction, date… · ${plural(list.length, 'résultat')}</div>
    ${list.map(valCard).join('') || '<div class="empty">Aucune fiche.</div>'}`;
}
function valTab() {
  const c = (v, t) => `<button data-act="valFilter" data-v="${v}" class="${S.valFilter === v ? 'on' : ''}">${t}</button>`;
  return `<div class="search">${I.search.replace('<svg', '<svg style="color:var(--muted)"')}<label class="sr" for="q">Rechercher une fiche</label><input id="q" type="search" value="${esc(S.q)}" placeholder="Rechercher une fiche" autocomplete="off"></div>
    <div class="chips">${c('close', 'À clôturer')}${c('closed', 'Clôturées')}${c('all', 'Toutes')}</div>
    <div id="res">${valResults()}</div>`;
}

// ───── Manager : fiches d'un technicien ─────
function manCard(f) {
  if (f.statut === 'validee') {
    return `<div class="card fc okb"><div class="band ok">${I.check(14)}VALIDÉ par ${f.validatedByManager ? 'le manager' : 'le tech'}<span style="margin-left:auto;font-weight:600;font-size:12px">le ${fDT(f.validatedAt)}</span></div>
      <div class="body"><div class="row" style="font-weight:700;font-size:16px">${title(f)} ${vPill(f)}</div>
      <div class="cm" style="margin:2px 0 8px">${esc(f.typeErreur)} · Rejet ${esc(f.dateRejet)}</div>
      <div class="box" style="margin-top:0;font-size:13px"><small>Correction</small>${esc(f.correction)}</div>
      <div class="row" style="margin-top:10px"><button class="btn sec" data-act="open" data-id="${f.id}">Voir la fiche</button><button class="btn okb" data-act="close" data-id="${f.id}">Clôturer</button></div></div></div>`;
  }
  const j = jx(f);
  if (j.late) {
    return `<button class="card fc lateb" data-act="open" data-id="${f.id}"><div class="band late">${I.clock}EN RETARD<span style="margin-left:auto;font-size:15px">${j.label}</span></div>
      <div class="body"><div class="row" style="font-weight:700;font-size:16px">${title(f)} ${vPill(f)}</div>
      <div class="cm">${esc(f.typeErreur)} · ${f.version > 1 ? 'Renvoyée' : 'Créée'} le ${fD(f.sentAt)}</div>
      <div class="row" style="margin-top:8px;font-size:13px;color:var(--ko);font-weight:600"><span class="pill ko" style="padding:0;background:none"><i></i></span>En attente de correction</div></div></button>`;
  }
  return `<button class="card" data-act="open" data-id="${f.id}"><div class="row">${pill(f)}${vPill(f)}<span class="jx">${j.label}</span></div>
    <div class="ct" style="font-size:16px;margin-top:6px">${title(f)}</div><div class="cm">${esc(f.typeErreur)} · ${f.version > 1 ? 'Renvoyée' : 'Créée'} le ${fD(f.sentAt)}</div></button>`;
}
V.tech = v => {
  const list = S.fiches.filter(f => f.techKey === v.key && f.statut !== 'cloturee')
    .sort((a, b) => (a.statut === 'validee' ? 0 : 1) - (b.statut === 'validee' ? 0 : 1) || a.sentAt - b.sentAt);
  const name = techName(v.key, (S.fiches.find(f => f.techKey === v.key) || {}).tech);
  return {
    hdr: hdrSub(esc(name), list.length ? plural(list.length, 'fiche ouverte', 'fiches ouvertes') : 'Aucune fiche ouverte'),
    main: (list.map(manCard).join('') || '<div class="empty">Aucune fiche ouverte pour ce technicien.</div>')
      + `<div class="cm" style="text-align:center;padding:4px 10px">J-1, J-2 : normal · au-delà de 2 jours ouvrés la fiche passe « En retard »</div>
      <button class="link" data-act="history" data-name="${esc(name)}">Historique de ${esc(name)}</button>`
  };
};

// ───── Fiche de correction ─────
V.fiche = v => {
  const f = fiche(v.id);
  if (!f) return { hdr: hdrSub('Fiche de correction'), main: '<div class="empty">Cette fiche n\'existe plus.</div>' };
  const man = isMan(), mineEdit = f.statut === 'a_corriger' && (man || f.techKey === S.me.nameKey);
  const d = S.drafts[f.id] || (S.drafts[f.id] = { type: f.typeErreur || '', corr: f.correction || '', done: false });
  const j = jx(f);
  const typeMod = mineEdit ? (d.type.trim() !== (f.typeErreurInitial || '')) : modified(f);
  const last = (f.historique || [])[f.historique ? f.historique.length - 1 : 0];

  const infos = `<div class="card"><div class="lbl">Infos du retour</div>
    <div class="grid2">
      <div><small>N° d'OT</small><span>${esc(f.ot)}</span></div><div><small>N° du test</small><span>${esc(f.test)}</span></div>
      <div><small>Intervention</small><span>${esc(f.dateIntervention)}</span></div><div><small>Rejet</small><span>${esc(f.dateRejet)}</span></div>
      <div><small>Technicien</small><span>${esc(techName(f.techKey, f.tech))}</span></div>
      <div><small>${f.version > 1 ? `Renvoyée (V${f.version}) le` : 'Envoyée le'}</small><span>${fD(f.sentAt)}${f.statut === 'a_corriger' ? ` · <span style="color:${j.late ? 'var(--ko)' : 'inherit'}">${j.label}</span>` : ''}</span></div>
    </div>
    ${mineEdit
      ? `<label class="l" for="type">Type d'erreur ${typeMod ? `<span class="pill mod" id="modP">Modifié${man ? '' : ' par le tech'}</span>` : '<span id="modP"></span>'}</label>
         <input id="type" type="text" list="types" class="${typeMod ? 'mod' : ''}" value="${esc(d.type)}"><datalist id="types">${errorTypes().map(t => `<option value="${esc(t)}">`).join('')}</datalist>
         <div class="cm" style="margin-top:3px;font-size:12px">Initial : ${esc(f.typeErreurInitial)} · modifiable si le type n'est pas le bon</div>`
      : `<div class="fld" style="margin-top:12px"><small style="display:flex;align-items:center;gap:6px">Type d'erreur ${typeMod ? '<span class="pill mod">Modifié par le tech</span>' : ''}</small><b style="font-size:15px">${esc(f.typeErreur)}</b>${typeMod ? `<small>Initial : ${esc(f.typeErreurInitial)}</small>` : ''}</div>`}
    <div class="box"><small>Commentaire</small>${esc(f.commentaire) || '—'}</div>
    ${f._pending ? '<div class="pend" style="margin-top:8px">En attente d\'envoi (hors ligne)…</div>' : ''}
  </div>`;

  const renvoi = f.statut === 'a_corriger' && f.version > 1 && last
    ? `<div class="info warn">${I.undo}<span><b>Renvoyée par le manager le ${fD(last.renvoyeAt)}</b>${last.motif ? ' : ' + esc(last.motif) : ''}</span></div>` : '';

  let corr;
  if (mineEdit) {
    corr = `<div class="card"><div class="lbl b">${man ? 'Valider à la place du technicien' : 'Ma correction'}</div>
      ${man ? '<p class="cm" style="margin:-4px 0 6px">Remplissez la correction si vous l\'avez faite ou constatée vous-même.</p>' : ''}
      <label class="l" for="corr" style="margin-top:0">Correction apportée</label>
      <textarea id="corr" rows="4" placeholder="Décrivez la correction effectuée">${esc(d.corr)}</textarea>
      <label class="check"><input type="checkbox" id="done" ${d.done ? 'checked' : ''}>La correction a été effectuée</label></div>`;
  } else if (f.statut === 'a_corriger') {
    corr = `<div class="card"><div class="lbl">Correction du technicien</div><div class="row" style="color:var(--ko);font-weight:600;font-size:14px"><span class="pill ko" style="padding:0;background:none"><i></i></span>En attente de correction · ${j.label}</div></div>`;
  } else {
    const n = bdays(f.sentAt, f.validatedAt);
    corr = `<div class="card"><div class="lbl ${man ? '' : 'b'}">${man ? 'Correction du technicien' : 'Ma correction'}</div>
      <div class="box" style="margin-top:0">${esc(f.correction)}</div>
      <div class="row" style="margin-top:10px;color:var(--ok);font-weight:600;font-size:14px">${I.check(16)}Correction effectuée · validée le ${fDT(f.validatedAt)}</div>
      ${f.validatedByManager ? `<div class="cm" style="margin-top:2px">Validée par ${esc(f.validatedBy)} (manager) à la place du technicien</div>` : ''}
      <div class="cm" style="margin-top:2px;${n > 2 ? 'color:#9a3412;font-weight:600' : ''}">Délai : ${plural(n, 'jour ouvré', 'jours ouvrés')}</div>
      ${f.statut === 'cloturee' ? `<div class="cm" style="margin-top:2px">Clôturée le ${fDT(f.closedAt)}</div>` : ''}</div>`;
  }

  const hist = (f.historique || []).length ? `<div class="card"><div class="lbl">Versions précédentes</div>${f.historique.slice().reverse().map(h => `
    <div class="hist"><div class="row"><span class="pill v">V${h.version}</span><span class="cm">${h.validatedAt ? 'validée le ' + fD(h.validatedAt) : 'non validée'} · renvoyée le ${fD(h.renvoyeAt)}</span></div>
    ${h.correction ? `<div style="margin-top:6px"><span class="cm">Correction : </span>${esc(h.correction)}</div>` : ''}
    ${h.motif ? `<div style="margin-top:4px"><span class="cm">Motif du renvoi : </span>${esc(h.motif)}</div>` : ''}</div>`).join('')}</div>` : '';

  let bar = '';
  const ok = d.corr.trim() && d.done ? '' : 'disabled';
  if (mineEdit && man) bar = `<button class="btn sec v-btn" data-act="validate" data-id="${f.id}" ${ok}>${I.check()}Valider</button><button class="btn okb v-btn" data-act="validate" data-close="1" data-id="${f.id}" ${ok}>${I.check()}Valider et clôturer</button>`;
  else if (mineEdit) bar = `<button class="btn okb v-btn" data-act="validate" data-id="${f.id}" ${ok}>${I.check()}Valider la correction</button>`;
  else if (man && f.statut === 'validee') bar = `<button class="btn sec" data-act="resend" data-id="${f.id}">${I.undo}Renvoyer</button><button class="btn okb" data-act="close" data-id="${f.id}">${I.check()}Clôturer</button>`;
  else if (man && f.statut === 'cloturee') bar = `<button class="btn sec" data-act="resend" data-id="${f.id}">${I.undo}Renvoyer au tech (V${f.version + 1})</button>`;

  return {
    hdr: hdrSub('Fiche de correction', `${title(f)}${f.version > 1 ? ' · V' + f.version : ''}`) .replace(/<div class="net[\s\S]*<\/div>$/, '') + `<span style="margin-right:2px">${pill(f)}</span>`,
    main: renvoi + infos + corr + hist + (man ? `<button class="link" style="color:var(--ko)" data-act="del" data-id="${f.id}">Supprimer la fiche</button>` : ''),
    bar,
    after() {
      if (!mineEdit) return;
      const upd = () => {
        d.type = $('#type').value; d.corr = $('#corr').value; d.done = $('#done').checked;
        document.querySelectorAll('.v-btn').forEach(b => b.disabled = !(d.corr.trim() && d.done));
        const m = d.type.trim() !== (f.typeErreurInitial || '');
        $('#type').classList.toggle('mod', m);
        $('#modP').outerHTML = m ? `<span class="pill mod" id="modP">Modifié${man ? '' : ' par le tech'}</span>` : '<span id="modP"></span>';
      };
      ['#type', '#corr'].forEach(s => $(s).addEventListener('input', upd));
      $('#done').addEventListener('change', upd);
    }
  };
};

// ───── Manager : nouvelle fiche (coller Excel) ─────
// Colonnes du tableau Excel (ordre par défaut, si l'en-tête n'est pas collé)
const DEF = { etat: 0, dateIntervention: 1, ot: 2, test: 3, dateRejet: 5, typeErreur: 7, commentaire: 8, tech: 12 };
function parseTSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  const sep = text.includes('\t') ? '\t' : ';';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"' && cell === '') q = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.map(r => r.map(c => c.trim())).filter(r => r.some(Boolean));
}
function headerMap(cells) {
  const n = cells.map(norm);
  if (!(n.includes('ot') && n.includes('etat'))) return null;
  const f = re => n.findIndex(c => re.test(c));
  const m = { etat: f(/^etat$/), dateIntervention: f(/date.*intervention/), ot: f(/^ot$/), test: f(/\btest\b/), dateRejet: f(/date.*rejet/), typeErreur: f(/type.*erreur/), commentaire: f(/raison/), tech: f(/intervenant/) };
  Object.keys(m).forEach(k => { if (m[k] < 0) m[k] = DEF[k]; });
  return m;
}
function parsePaste(text) {
  let map = DEF; const out = [];
  parseTSV(text).forEach(cells => {
    const h = headerMap(cells); if (h) { map = h; return; }
    const g = k => (cells[map[k]] || '').trim();
    const ot = g('ot');
    if (!ot || norm(ot) === 'ot') return;
    out.push({ etatExcel: g('etat'), dateIntervention: g('dateIntervention'), ot, test: g('test'), dateRejet: g('dateRejet'), typeErreur: g('typeErreur'), commentaire: g('commentaire'), tech: g('tech') });
  });
  return out;
}
V.new = () => {
  const rows = parsePaste(S.paste);
  return {
    hdr: hdrSub('Nouvelle fiche de correction', 'Coller une ou plusieurs lignes Excel', I.close),
    main: `<div class="card"><div class="row" style="margin-bottom:8px"><label class="lbl" for="paste" style="margin:0">1 · Ligne(s) Excel</label>
        <button class="btn" style="margin-left:auto;min-height:38px;padding:6px 12px;font-size:14px" data-act="pasteBtn">${I.paste}Coller</button></div>
      <textarea id="paste" rows="4" style="font-family:ui-monospace,Menlo,monospace;font-size:13px;border-style:dashed;border-color:var(--blue);background:#eef2fa" placeholder="Copiez la ligne dans Excel puis collez-la ici">${esc(S.paste)}</textarea>
      <div class="cm" style="margin-top:6px">Plusieurs lignes = plusieurs fiches. L'en-tête peut être collé ou non.</div></div>
      <div id="pv">${previewHTML(rows)}</div>`,
    bar: `<button class="btn pri" id="sendBtn" data-act="send" ${rows.length ? '' : 'disabled'}>${I.send}${rows.length > 1 ? `Envoyer ${rows.length} fiches` : rows.length ? `Envoyer à ${esc(techName(nameKey(rows[0].tech), rows[0].tech) || '…')}` : 'Envoyer'}</button>`,
    after() {
      $('#paste').addEventListener('input', e => {
        S.paste = e.target.value; const r = parsePaste(S.paste);
        $('#pv').innerHTML = previewHTML(r);
        const b = $('#sendBtn'); b.disabled = !r.length;
        b.innerHTML = I.send + (r.length > 1 ? `Envoyer ${r.length} fiches` : r.length ? `Envoyer à ${esc(techName(nameKey(r[0].tech), r[0].tech) || '…')}` : 'Envoyer');
      });
    }
  };
};
function previewHTML(rows) {
  if (!S.paste.trim()) return '';
  if (!rows.length) return `<div class="info warn">${I.info}<span>Aucune ligne reconnue. Copiez la ligne entière depuis Excel (de la colonne ÉTAT jusqu'à « Nom intervenant »).</span></div>`;
  return `<div class="card"><div class="lbl">2 · Vérifier ${rows.length > 1 ? `les ${rows.length} fiches` : 'la fiche'}</div>
    <div class="row" style="color:var(--ok);font-weight:600;font-size:13px;margin:-4px 0 10px">${I.check(15)}${plural(rows.length, 'ligne reconnue', 'lignes reconnues')}</div>
    ${rows.map(r => {
      const k = nameKey(r.tech), u = userByKey(k);
      const dup = S.fiches.some(f => f.ot === r.ot && f.test === r.test && f.statut !== 'cloturee');
      return `<div class="pv ${dup ? 'dup' : ''}"><div class="g">
        <small>Intervention</small><span>${esc(r.dateIntervention)}</span>
        <small>N° d'OT</small><b>${esc(r.ot)}</b>
        <small>N° du test</small><b>${esc(r.test)}</b>
        <small>Rejet</small><span>${esc(r.dateRejet)}</span>
        <small>Type d'erreur</small><span>${esc(r.typeErreur) || '—'}</span>
        <small>Commentaire</small><span>${esc(r.commentaire) || '—'}</span>
        <small>Technicien</small><span>${esc(u ? u.prenom + ' ' + u.nom : r.tech) || '<b style="color:var(--ko)">manquant</b>'} ${r.tech ? (u ? '<span class="pill ok" style="font-size:11px;padding:1px 7px">compte trouvé</span>' : '<span class="pill mod">pas encore de compte</span>') : ''}</span>
      </div>${dup ? '<div class="pend" style="margin-top:8px">Une fiche ouverte existe déjà pour cet OT et ce test.</div>' : ''}</div>`;
    }).join('')}
    <div class="cm">Un technicien sans compte verra la fiche dès qu'il créera son compte avec le même prénom et nom.</div></div>`;
}

// ───────── Actions ─────────
const now = () => Date.now();
const A = {
  back,
  profile() {
    openSheet(`<h2>${esc(S.me.prenom)} ${esc(S.me.nom)}</h2>
      <p class="cm" style="margin:0 0 14px">${isMan() ? 'Manager' : 'Technicien'} · ${S.store.mode === 'demo' ? 'Mode démo (données sur ce téléphone)' : 'Synchronisé'}</p>
      <div class="card" style="background:var(--bg);box-shadow:none"><div class="lbl">Réglages · type de compte</div>
      ${isMan()
        ? `<p class="cm" style="margin:0 0 10px">Vous êtes manager.</p><button class="btn" style="width:100%" data-act="toTech">Repasser en compte technicien</button>`
        : `<p class="cm" style="margin:0 0 4px">Passer en compte manager (code manager demandé).</p>
           <label class="l" for="mCode">Code manager</label><input id="mCode" type="text" autocomplete="off">
           <div class="err" id="mErr"></div>
           <button class="btn pri" style="width:100%" data-act="toManager">Passer en compte manager</button>`}</div>
      ${isMan() ? `<button class="btn" style="width:100%;margin-bottom:12px" data-act="accounts">Comptes de l'équipe · ${S.users.filter(u => u.uid !== S.me.uid).length}</button>` : ''}
      <button class="btn dang" style="width:100%" data-act="logout">Se déconnecter</button>
      <button class="link" data-act="closeSheet">Fermer</button>`);
  },
  accounts() {
    const list = S.users.filter(u => u.uid !== S.me.uid).sort((a, b) => (a.role === b.role ? 0 : a.role === 'manager' ? 1 : -1) || (a.prenom + a.nom).localeCompare(b.prenom + b.nom));
    openSheet(`<h2>Comptes de l'équipe</h2>
      <p class="cm" style="margin:0 0 12px">Réinitialiser : la personne choisit un nouveau mot de passe à sa prochaine connexion. Supprimer : le compte disparaît, ses fiches sont gardées.</p>
      ${list.map(u => `<div class="card" style="background:var(--bg);box-shadow:none;padding:12px">
        <div class="row"><div class="av" style="width:36px;height:36px;font-size:13px">${esc(initials(u.prenom + ' ' + u.nom))}</div>
        <div style="flex:1;min-width:0"><b>${esc(u.prenom)} ${esc(u.nom)}</b><div class="cm">${u.role === 'manager' ? 'Manager' : 'Technicien'}${u.reset ? ' · <span style="color:var(--mod);font-weight:600">mot de passe réinitialisé, en attente</span>' : ''}</div></div></div>
        <div class="row" style="margin-top:10px"><button class="btn sec" style="font-size:14px;padding:9px" data-act="askReset" data-uid="${u.uid}" ${u.reset ? 'disabled' : ''}>Réinitialiser le mot de passe</button><button class="btn dang" style="font-size:14px;padding:9px" data-act="askDelAcc" data-uid="${u.uid}">Supprimer</button></div>
      </div>`).join('') || '<div class="empty">Aucun autre compte.</div>'}
      <button class="link" data-act="profile">Retour aux réglages</button>`);
  },
  askReset(el) {
    const u = S.users.find(x => x.uid === el.dataset.uid);
    openSheet(`<h2>Réinitialiser le mot de passe ?</h2><p class="cm" style="margin:0 0 14px">${esc(u.prenom)} ${esc(u.nom)} sera déconnecté(e) et choisira un nouveau mot de passe à sa prochaine connexion (bouton Se connecter, avec son prénom et son nom). Ses fiches sont conservées.</p>
      <div class="row"><button class="btn sec" data-act="accounts">Annuler</button><button class="btn pri" data-act="doReset" data-uid="${u.uid}">Réinitialiser</button></div>`);
  },
  async doReset(el) {
    const u = S.users.find(x => x.uid === el.dataset.uid); el.disabled = true;
    try { await S.store.resetAccount(u); toast(`Mot de passe de ${u.prenom} réinitialisé`); A.accounts(); }
    catch (e) { toast(errMsg(e)); el.disabled = false; }
  },
  askDelAcc(el) {
    const u = S.users.find(x => x.uid === el.dataset.uid);
    openSheet(`<h2>Supprimer le compte ?</h2><p class="cm" style="margin:0 0 14px">Le compte de ${esc(u.prenom)} ${esc(u.nom)} sera supprimé et la personne déconnectée. Ses fiches sont gardées ; avec le code d'accès, elle pourra recréer un compte à son nom.</p>
      <div class="row"><button class="btn sec" data-act="accounts">Annuler</button><button class="btn" style="flex:1;background:var(--ko);border-color:var(--ko);color:#fff" data-act="doDelAcc" data-uid="${u.uid}">Supprimer</button></div>`);
  },
  async doDelAcc(el) {
    const u = S.users.find(x => x.uid === el.dataset.uid); el.disabled = true;
    try { await S.store.deleteAccount(u); toast(`Compte de ${u.prenom} supprimé`); A.accounts(); }
    catch (e) { toast(errMsg(e)); el.disabled = false; }
  },
  cancelReset() { S.authReset = null; S.authTab = 'login'; render(); },
  closeSheet,
  async toManager() {
    try { await S.store.setRole(S.me, 'manager', $('#mCode').value); closeSheet(); toast('Vous êtes maintenant manager'); }
    catch (e) { $('#mErr').textContent = errMsg(e); }
  },
  async toTech() {
    try { await S.store.setRole(S.me, 'tech'); closeSheet(); toast('Vous êtes maintenant technicien'); }
    catch (e) { toast(errMsg(e)); }
  },
  async logout() { closeSheet(); S.drafts = {}; await S.store.signOut(); },
  authTab(el) { S.authTab = el.dataset.v; S.authErr = ''; render(); },
  techTab(el) { S.techTab = el.dataset.v; render(); },
  manTab(el) { S.manTab = el.dataset.v; render(); },
  valFilter(el) { S.valFilter = el.dataset.v; render(); },
  open(el) { go({ name: 'fiche', id: el.dataset.id }); },
  tech(el) { go({ name: 'tech', key: el.dataset.key }); },
  new() { S.paste = ''; go({ name: 'new' }); },
  history(el) { S.manTab = 'val'; S.valFilter = 'all'; S.q = el.dataset.name; S.view = { name: 'home' }; history.pushState(S.view, ''); render(); },
  async pasteBtn() {
    try { const t = await navigator.clipboard.readText(); if (t) { S.paste = t; render(); } }
    catch (e) { toast('Collez avec un appui long dans le cadre'); $('#paste').focus(); }
  },
  send() {
    const rows = parsePaste(S.paste); if (!rows.length) return;
    const t = now(), by = `${S.me.prenom} ${S.me.nom}`;
    S.store.addFiches(rows.map(r => ({
      ...r, typeErreurInitial: r.typeErreur, techKey: nameKey(r.tech), statut: 'a_corriger', version: 1,
      createdAt: t, sentAt: t, createdBy: by, correction: '', correctionFaite: false, validatedAt: null, closedAt: null, historique: []
    })));
    S.paste = ''; toast(rows.length > 1 ? `${rows.length} fiches envoyées` : 'Fiche envoyée'); back();
  },
  validate(el) {
    const f = fiche(el.dataset.id), d = S.drafts[f.id];
    if (!d || !d.corr.trim() || !d.done) return;
    const t = now(), close = isMan() && el.dataset.close;
    S.store.updateFiche(f.id, { typeErreur: d.type.trim() || f.typeErreurInitial, correction: d.corr.trim(), correctionFaite: true, statut: close ? 'cloturee' : 'validee', validatedAt: t, validatedBy: `${S.me.prenom} ${S.me.nom}`, validatedByManager: isMan(), closedAt: close ? t : null });
    delete S.drafts[f.id];
    toast(close ? 'Fiche validée et clôturée' : 'Correction validée'); S.techTab = 'todo'; back();
  },
  close(el) {
    S.store.updateFiche(el.dataset.id, { statut: 'cloturee', closedAt: now() });
    toast('Fiche clôturée');
    if (S.view.name === 'fiche') back();
  },
  resend(el) {
    const f = fiche(el.dataset.id);
    openSheet(`<h2>Renvoyer au technicien</h2>
      <p class="cm" style="margin:0 0 6px">La fiche sera rouverte en <b>V${f.version + 1}</b> chez ${esc(techName(f.techKey, f.tech))}. La correction actuelle est gardée dans l'historique.</p>
      <label class="l" for="motif">Motif du renvoi</label><textarea id="motif" rows="3" placeholder="Ce qui ne va pas dans la correction"></textarea>
      <div class="row" style="margin-top:14px"><button class="btn sec" data-act="closeSheet">Annuler</button><button class="btn pri" data-act="doResend" data-id="${f.id}">${I.undo}Renvoyer en V${f.version + 1}</button></div>`);
    setTimeout(() => $('#motif').focus(), 50);
  },
  doResend(el) {
    const f = fiche(el.dataset.id), t = now();
    const h = [...(f.historique || []), { version: f.version || 1, correction: f.correction || '', typeErreur: f.typeErreur || '', validatedAt: f.validatedAt || null, closedAt: f.closedAt || null, renvoyeAt: t, motif: $('#motif').value.trim() }];
    S.store.updateFiche(f.id, { historique: h, version: (f.version || 1) + 1, statut: 'a_corriger', correction: '', correctionFaite: false, validatedAt: null, validatedByManager: false, closedAt: null, sentAt: t });
    closeSheet(); toast(`Fiche renvoyée en V${(f.version || 1) + 1}`); back();
  },
  del(el) {
    openSheet(`<h2>Supprimer cette fiche ?</h2><p class="cm" style="margin:0 0 14px">Elle disparaîtra aussi chez le technicien. Cette action est définitive.</p>
      <div class="row"><button class="btn sec" data-act="closeSheet">Annuler</button><button class="btn" style="flex:1;background:var(--ko);border-color:var(--ko);color:#fff" data-act="doDel" data-id="${el.dataset.id}">Supprimer</button></div>`);
  },
  doDel(el) { S.store.deleteFiche(el.dataset.id); closeSheet(); toast('Fiche supprimée'); back(); }
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const fn = A[el.dataset.act]; if (fn) { e.preventDefault(); fn(el); }
});
document.addEventListener('input', e => {
  if (e.target.id === 'q') { S.q = e.target.value; const r = $('#res'); if (r) r.innerHTML = valResults(); }
});

// ───────── Démarrage ─────────
(async function start() {
  history.replaceState({ name: 'home' }, '');
  try { S.store = await createStore(); }
  catch (e) { $('#main').innerHTML = `<div class="empty">Impossible de démarrer : ${esc(e.message)}</div>`; return; }
  S.store.onAuth(me => {
    const changed = (me && me.uid) !== (S.me && S.me.uid);
    const roleChanged = !changed && me && S.me && me.role !== S.me.role;
    S.me = me;
    if (roleChanged) { S.view = { name: 'home' }; S.techTab = 'todo'; S.manTab = 'techs'; history.replaceState(S.view, ''); }
    if (changed) {
      if (S.unwatch) { S.unwatch(); S.unwatch = null; }
      S.users = []; S.fiches = []; S.view = { name: 'home' }; S.techTab = 'todo'; S.manTab = 'techs';
      if (me) S.unwatch = S.store.watch(u => {
        S.users = u;
        const mine = u.find(x => x.uid === S.me.uid);
        if (u.length && (!mine || mine.reset) && navigator.onLine) { closeSheet(); toast('Votre compte a été réinitialisé ou supprimé par un manager'); S.store.signOut(); return; }
        render();
      }, f => { S.fiches = f; render(); });
    }
    render();
  });
  // Rafraîchit les J-x au changement de jour / retour sur l'appli
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.me) render(); });
})();
