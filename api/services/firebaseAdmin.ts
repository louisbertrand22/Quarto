import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

/**
 * Accès administrateur à la Realtime Database (contourne les règles de sécurité).
 * Seul le serveur écrit les statistiques : les règles interdisent toute écriture côté client.
 *
 * Variables d'environnement (Vercel) :
 * - FIREBASE_SERVICE_ACCOUNT : JSON complet de la clé de compte de service
 * - FIREBASE_DATABASE_URL (sinon VITE_FIREBASE_DATABASE_URL)
 */
export const getAdminDatabase = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const databaseURL = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL;
  if (!raw || !databaseURL) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT ou FIREBASE_DATABASE_URL manquant');
  }
  const app = getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(raw)), databaseURL });
  return getDatabase(app);
};

/** Même nettoyage que le front : Firebase interdit . # $ [ ] dans les clés. */
export const safeKey = (id: string) => id.replace(/[.#$[\]]/g, '_');
