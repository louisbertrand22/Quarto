import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase configuration
// For production, set these values in your environment variables
// For development, you can use the default demo values below
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBqX5YmH7K3N8pQ4rT6sU9vW0xY1zA2bC3",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "quarto-game-online.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://quarto-game-online-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "quarto-game-online",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "quarto-game-online.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abcdef1234567890abcdef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);
