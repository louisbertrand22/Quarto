import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleAuthRequest } from './routes/authRoutes.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Cette fonction va recevoir toutes les requêtes /api/auth/*
  // et les passer à ton fichier de routes
  try {
    await handleAuthRequest(req, res);
  } catch (error) {
    console.error('Erreur API Auth:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}