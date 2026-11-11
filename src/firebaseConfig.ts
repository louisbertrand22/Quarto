import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off, get, query, orderByChild, limitToLast } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
// For production, set these values in your environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validate that required environment variables are set
// We only validate the essential fields needed for Firebase to work
if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL || !firebaseConfig.projectId || !firebaseConfig.appId) {
  throw new Error(
    'Missing Firebase configuration. Please set up your .env file with Firebase credentials. ' +
    'See .env.example for required variables.'
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);
export const firestore = getFirestore(app);

/**
 * Envoie une partie terminée au serveur, qui la rejoue et enregistre le résultat.
 * Le navigateur n'écrit plus jamais dans la base : les règles Firebase l'interdisent.
 */
export const submitGameResult = async (game: {
  mode: 'vs-ai' | 'online';
  level?: 'easy' | 'normal' | 'expert';
  victoryOptions: { lines: boolean; squares: boolean };
  moves: { piece: number; givenBy: 1 | 2; cell: { row: number; col: number } | null }[];
  timedOut?: boolean;
  playerNumber?: 1 | 2;
}): Promise<void> => {
  const token = localStorage.getItem('access_token');
  if (!token) return;
  try {
    const response = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(game),
    });
    if (!response.ok) console.warn('Partie non enregistrée :', response.status, await response.text());
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la partie :", error);
  }
};

/**
 * Écoute les statistiques d'un joueur en temps réel
 * Utile pour ta page Profil
 */
export const subscribeToUserStats = (userId: string, callback: (stats: any) => void) => {
  const safeId = userId;
  const statsRef = ref(database, `users/${safeId}/stats`);

  onValue(statsRef, (snapshot) => {
    const data = snapshot.val() || { totalGames: 0, wins: 0 };
    
    // Calcul du ratio de victoire en temps réel
    const winRate = data.totalGames > 0 
      ? Math.round((data.wins / data.totalGames) * 100) 
      : 0;

    callback({ ...data, winRate });
  });

  // Retourne la fonction pour stopper l'écoute (cleanup)
  return () => off(statsRef);
};

export const getLeaderboard = async () => {
  const dbRef = query(ref(database, 'users'), orderByChild('stats/wins'), limitToLast(10));
  const snapshot = await get(dbRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.entries(data)
      .map(([id, user]: any) => ({
        id,
        username: user.username,
        wins: user.stats?.wins || 0,
        totalGames: user.stats?.totalGames || 0
      }))
      .sort((a, b) => b.wins - a.wins);
  }
  return [];
};

export const getLastGames = async (userId: string) => {
  const safeUserId = userId.replace(/[.#$[\]]/g, "_");
  
  const historyRef = ref(database, `users/${safeUserId}/history`);
  
  const lastGamesQuery = query(historyRef, limitToLast(10));

  try {
    const snapshot = await get(lastGamesQuery);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.entries(data)
        .map(([id, game]: any) => ({
          id,
          date: game.date,
          result: game.result,
          Options: game.Options
        }))
        .sort((a, b) => b.date - a.date);
    }
    return [];
  } catch (error) {
    console.error("Erreur lors de la récupération de l'historique:", error);
    throw error;
  }
};

export const getUsernameFromUserId = async (userId: string) => {
  const safeUserId = userId.replace(/[.#$[\]]/g, "_");
  const usernameRef = ref(database, `users/${safeUserId}/username`);
  try {
    const snapshot = await get(usernameRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return data;
    }
    return "Inconnu";
  } catch (error) {
    console.error("Erreur lors de la récupération de l'historique:", error);
    throw error;
  }
};