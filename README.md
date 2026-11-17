# Mape Corrections

Fiches de correction des rapports rejetés, entre le manager et les techniciens Groupe Mape.
Appli web installable (comme Mape Calculs), hébergée sur GitHub Pages, données partagées via Firebase.

## Fichiers
| Fichier | Rôle |
|---|---|
| `index.html` | Page et styles |
| `app.js` | Écrans et fonctionnement |
| `store.js` | Lecture / écriture des fiches (Firebase ou mode démo) |
| `config.js` | **À compléter** : configuration Firebase + code d'accès |
| `firebase.js` | Bibliothèque Firebase (embarquée pour le hors ligne) |
| `sw.js`, `manifest.json`, `icon-*.png` | Installation sur le téléphone et hors ligne |

Tant que `config.js` contient `FIREBASE_CONFIG = null`, l'appli tourne en **mode démo** (données sur le téléphone seulement).

## 1. Créer le projet Firebase (10 min, gratuit)
1. Aller sur **console.firebase.google.com** avec un compte Google › **Créer un projet** › nom : `mape-corrections` (Google Analytics : inutile, désactiver).
2. **Authentication** › Commencer › onglet *Sign-in method* › activer **Adresse e-mail/Mot de passe** › Enregistrer.
3. **Firestore Database** › Créer une base de données › emplacement **europe-west** (Belgique) ou **eur3** › démarrer en **mode production**.
4. Firestore › onglet **Règles** › remplacer tout par le bloc ci-dessous › **Publier**.
5. Roue crantée ⚙ › **Paramètres du projet** › *Vos applications* › icône **</>** (Web) › nom : `Mape Corrections` (pas besoin de Firebase Hosting) › copier le bloc `firebaseConfig`.
6. Coller ce bloc dans `config.js` à la place de `null`.

### Règles de sécurité Firestore
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function chemin(c, id) { return /databases/$(db)/documents/$(c)/$(id); }
    function prof() { return get(chemin('users', request.auth.uid)).data; }
    // Compte actif : profil existant ET le nom pointe vers ce compte, non réinitialisé
    function inscrit() {
      return request.auth != null && exists(chemin('users', request.auth.uid))
        && get(chemin('names', prof().nid)).data.uid == request.auth.uid
        && get(chemin('names', prof().nid)).data.reset == false;
    }
    function manager() { return inscrit() && prof().role == 'manager'; }
    function codesOk(d) {
      return d.get('code', '').upper() == 'MAPEMLE26'
        && (d.role != 'manager' || d.get('codeManager', '').lower() == 'cpmape');
    }

    // Lien nom → compte (ne contient pas le nom en clair)
    match /names/{nid} {
      allow read: if true;
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.gen == 0 && request.resource.data.reset == false
        && codesOk(getAfter(chemin('users', request.auth.uid)).data);
      allow update: if
        // manager : réinitialiser ou supprimer un compte
        (manager() && request.resource.data.gen == resource.data.gen + 1
          && request.resource.data.reset == true)
        // nouveau mot de passe après réinitialisation (même rôle)
        || (request.auth != null && resource.data.reset == true
          && resource.data.get('deleted', false) == false
          && request.resource.data.reset == false
          && request.resource.data.uid == request.auth.uid
          && request.resource.data.gen == resource.data.gen
          && request.resource.data.role == resource.data.role
          && existsAfter(chemin('users', request.auth.uid)))
        // nouveau compte sur un nom supprimé (codes exigés)
        || (request.auth != null && resource.data.get('deleted', false) == true
          && request.resource.data.reset == false
          && request.resource.data.deleted == false
          && request.resource.data.uid == request.auth.uid
          && request.resource.data.gen == resource.data.gen
          && codesOk(getAfter(chemin('users', request.auth.uid)).data))
        // changement de rôle par la personne elle-même
        || (inscrit() && resource.data.uid == request.auth.uid
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['role'])
          && request.resource.data.role == getAfter(chemin('users', request.auth.uid)).data.role);
    }

    match /users/{uid} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == uid
        && getAfter(chemin('names', request.resource.data.nid)).data.uid == uid
        && (codesOk(request.resource.data)
          || (get(chemin('names', request.resource.data.nid)).data.reset == true
            && request.resource.data.role == get(chemin('names', request.resource.data.nid)).data.role));
      allow update: if
        (inscrit() && request.auth.uid == uid
          && request.resource.data.nid == resource.data.nid
          && request.resource.data.get('code', '') == resource.data.get('code', '')
          && (request.resource.data.role != 'manager'
            || request.resource.data.get('codeManager', '').lower() == 'cpmape'))
        || (manager() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['reset']));
      allow delete: if manager()
        || (resource.data.get('reset', false) == true
          && getAfter(chemin('names', resource.data.nid)).data.uid == request.auth.uid);
    }

    match /fiches/{id} {
      allow read, write: if inscrit();
    }
  }
}
```
Le code d'accès `MAPEMLE26` et le code manager `CPMape` sont vérifiés par ces règles (qui ne sont pas visibles publiquement) : sans le premier, impossible de créer un compte ni de voir les fiches ; sans le second, impossible d'être manager.
Pour changer un code : le modifier ici. Les codes de `config.js` ne servent qu'au mode démo : une fois Firebase branché, vous pouvez les remplacer par `''`.

**Comptes réinitialisés / supprimés** : l'ancien compte reste dans *Authentication* (console Firebase) mais n'a plus aucun accès. Vous pouvez le supprimer de la console pour faire le ménage (facultatif).

## 2. Mettre en ligne sur GitHub Pages
1. Créer l'organisation / le dépôt (ex. `mape-corrections/mape-corrections.github.io`).
2. Y déposer tous les fichiers de ce dossier.
3. L'appli est en ligne sur `https://mape-corrections.github.io`.
4. Sur chaque téléphone : ouvrir le lien › menu › **Ajouter à l'écran d'accueil**.

À chaque mise à jour des fichiers, changer `VERSION` dans `sw.js` pour que les téléphones prennent la nouvelle version.

## Fonctionnement
- **Comptes** : prénom + nom + mot de passe, code d'accès à la création ; code manager en plus pour un compte manager. Dans les réglages (rond avec les initiales), un technicien peut passer manager avec le code manager, et un manager repasser technicien. Le manager y trouve aussi **Comptes de l'équipe** : réinitialiser le mot de passe d'une personne (elle en choisit un nouveau à sa prochaine connexion) ou supprimer son compte (ses fiches sont gardées). Un même compte s'utilise sur plusieurs appareils (téléphone, ordinateur). Le prénom et le nom doivent être ceux du tableau Excel (colonne « Nom intervenant ») : c'est ce qui relie la fiche au bon technicien (majuscules, accents et ordre prénom/nom sans importance).
- **Manager** : bouton *Nouvelle fiche* › coller une ou plusieurs lignes Excel (avec ou sans l'en-tête). Colonnes reprises : ÉTAT, Date d'intervention, OT, N° Test, Date du rejet, Type d'erreur, Raison rejet (= commentaire), Nom intervenant.
- **Technicien** : ouvre la fiche, peut corriger le type d'erreur (pastille « Modifié »), écrit la correction, coche « correction effectuée », valide. La fiche passe dans *Anciennes*.
- **J-x** : jours ouvrés depuis l'envoi de la fiche (sans samedis, dimanches ni jours fériés français). Au-delà de 2 jours : « En retard ».
- **Validation par le manager** : sur une fiche en cours, le manager peut remplir la correction et valider à la place du technicien (« Valider » ou « Valider et clôturer ») ; la fiche indique qu'elle a été validée par le manager.
- **Rapports validés** : onglet du manager avec recherche dans toutes les infos des fiches.
- **Clôturer / Renvoyer** : le manager clôture une fiche validée, ou la renvoie (même clôturée) : elle repart chez le tech en V2, V3… avec le motif, et l'ancienne correction reste dans l'historique.
- **Hors ligne** : tout fonctionne sans réseau après la première connexion ; les changements partent dès le retour du réseau.
