// ─────────────────────────────────────────────────────────────
// Mape Corrections – configuration
// ─────────────────────────────────────────────────────────────
// Collez ici la configuration de votre projet Firebase
// (Console Firebase › Paramètres du projet › Vos applications › Config).
// Tant que FIREBASE_CONFIG vaut null, l'appli tourne en MODE DÉMO :
// les données restent sur le téléphone, rien n'est partagé.
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCq5ILDD-yfQ7Dia2bdb5o0m41t8-JLD3M",
  authDomain: "mape-corrections.firebaseapp.com",
  projectId: "mape-corrections",
  storageBucket: "mape-corrections.firebasestorage.app",
  messagingSenderId: "407895260486",
  appId: "1:407895260486:web:0bbec91bcba6159578f947"
};
/* Exemple :
export const FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "mape-corrections.firebaseapp.com",
  projectId: "mape-corrections",
  storageBucket: "mape-corrections.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
*/

// Code demandé à la création de compte (en mode Firebase, il est aussi
// vérifié par les règles de sécurité du serveur).
export const CODE_ACCES = 'MAPEMLE26';

// Code demandé pour un compte manager (à la création, ou pour passer
// d'un compte technicien à manager dans les réglages).
export const CODE_MANAGER = 'CPMape';
