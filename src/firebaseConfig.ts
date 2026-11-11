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
  roomId?: string;
}): Promise<{ result: string; delta?: number; elo?: number } | null> => {
  const token = localStorage.getItem('access_token');
  if (!token) return null;
  try {
    const response = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(game),
    });
    if (!response.ok) {
      console.warn('Partie non enregistrée :', response.status, await response.text());
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la partie :", error);
    return null;
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

export interface LeaderboardEntry {
  id: string;
  username: string;
  elo: number;
  ratedGames: number;
  wins: number;
  totalGames: number;
}

/** Classement Elo des parties en ligne : seuls les joueurs ayant au moins une partie classée y figurent. */
export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  let snapshot;
  try {
    snapshot = await get(query(ref(database, 'users'), orderByChild('stats/elo'), limitToLast(10)));
  } catch (error) {
    // Index « stats/elo » absent des règles déployées : tri côté navigateur en attendant
    console.warn('Classement : index stats/elo manquant (firebase deploy --only database)', error);
    snapshot = await get(ref(database, 'users'));
  }
  if (!snapshot.exists()) return [];
  return Object.entries(snapshot.val() as Record<string, { username?: string; stats?: Record<string, number> }>)
    .filter(([, user]) => typeof user.stats?.elo === 'number')
    .map(([id, user]) => ({
      id,
      username: user.username ?? '?',
      elo: user.stats!.elo,
      ratedGames: user.stats?.ratedGames || 0,
      wins: user.stats?.wins || 0,
      totalGames: user.stats?.totalGames || 0,
    }))
    .sort((a, b) => b.elo - a.elo)
    .slice(0, 10);
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
          Options: game.Options,
          mode: game.mode,
          level: game.level,
          moves: game.moves,
          me: game.me,
          opponent: game.opponent,
          eloDelta: game.eloDelta,
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