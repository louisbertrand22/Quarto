import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Accès administrateur à Firebase (contourne les règles de sécurité).
 * Seul le serveur écrit les statistiques : les règles interdisent toute écriture côté client.
 *
 * Variables d'environnement (Vercel) :
 * - FIREBASE_SERVICE_ACCOUNT : JSON complet de la clé de compte de service
 * - FIREBASE_DATABASE_URL (sinon VITE_FIREBASE_DATABASE_URL)
 */
const getAdminApp = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const databaseURL = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL;
  if (!raw || !databaseURL) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT ou FIREBASE_DATABASE_URL manquant');
  }
  return getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(raw)), databaseURL });
};

/** Realtime Database : statistiques, historique, classement. */
export const getAdminDatabase = () => getDatabase(getAdminApp());

/** Firestore : salles des parties en ligne. */
export const getAdminFirestore = () => getFirestore(getAdminApp());

/** Même nettoyage que le front : Firebase interdit . # $ [ ] dans les clés. */
export const safeKey = (id: string) => id.replace(/[.#$[\]]/g, '_');

/** Collection Firestore des salles (cf. src/onlineLogic.ts). */
export const ROOMS = 'onlineRooms';
export const ROOM_ID = /^[A-Z0-9]{6}$/;
