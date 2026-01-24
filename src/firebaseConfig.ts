import { initializeApp } from 'firebase/app';
import { getDatabase, ref, update, push, increment, serverTimestamp, onValue, off, get, query, orderByChild, limitToLast } from 'firebase/database';

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

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);

export const saveGameResult = async (userId: string, result: 'win' | 'loss' | 'draw', username: string) => {
  // Nettoyage de l'ID (Firebase Database n'aime pas certains caractères dans les clés)
  const safeUserId = userId.replace(/[.#$[\]]/g, "_");
  const userStatsRef = ref(database, `users/${safeUserId}/stats`);
  const historyRef = ref(database, `users/${safeUserId}/history`);

  const updates: any = {};
  
  updates[`users/${safeUserId}/username`] = username;

  // Mise à jour des compteurs globaux
  updates[`users/${safeUserId}/stats/totalGames`] = increment(1);
  if (result === 'win') {
    updates[`users/${safeUserId}/stats/wins`] = increment(1);
  }

  try {
    // 1. Mise à jour des statistiques
    await update(ref(database), updates);

    // 2. Ajout à l'historique (crée une nouvelle entrée unique)
    await push(historyRef, {
      date: serverTimestamp(),
      result: result
    });

    console.log(`Résultat ${result} enregistré pour ${userId}`);
  } catch (error) {
    console.error("Erreur Firebase:", error);
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