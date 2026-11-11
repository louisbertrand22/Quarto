import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { ServerValue } from 'firebase-admin/database';
import { getUserInfo } from './services/ssoService.js';
import { getAdminDatabase, safeKey } from './services/firebaseAdmin.js';
import { validateGame } from './services/gameValidator.js';

/** Délai minimal entre deux parties enregistrées pour un même joueur (anti-script). */
const MIN_INTERVAL_MS = 10_000;

/**
 * POST /api/games — enregistre le résultat d'une partie terminée.
 * Le joueur est identifié par son jeton SSO, le résultat est recalculé à partir des coups.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token manquant' });

  // 1. Identité : vérifiée auprès du SSO, jamais prise dans le corps de la requête
  let userId: string;
  let username: string;
  try {
    const info = await getUserInfo(authHeader.substring(7).trim());
    userId = info.sub || info.id;
    username = info.preferred_username || info.name || info.email || 'Joueur';
    if (!userId) return res.status(401).json({ error: 'Utilisateur inconnu' });
  } catch (error) {
    if (axios.isAxiosError(error) && [400, 401, 403].includes(error.response?.status ?? 0)) {
      return res.status(401).json({ error: 'Token expiré ou invalide' });
    }
    console.error('[games] Erreur SSO :', error);
    return res.status(502).json({ error: 'SSO indisponible' });
  }

  // 2. Partie : rejouée coup par coup, le résultat est calculé ici
  const verdict = validateGame(req.body);
  if (!verdict.ok) {
    console.warn(`[games] Partie refusée pour ${userId} : ${verdict.reason}`);
    return res.status(422).json({ error: 'Partie invalide', reason: verdict.reason });
  }
  const { result, game } = verdict;

  try {
    const db = getAdminDatabase();
    const userRef = db.ref(`users/${safeKey(userId)}`);

    // 3. Limite de fréquence, atomique grâce à une transaction
    const now = Date.now();
    const tx = await userRef.child('lastGameAt').transaction((last: number | null) =>
      last && now - last < MIN_INTERVAL_MS ? undefined : now
    );
    if (!tx.committed) return res.status(429).json({ error: 'Trop de parties en peu de temps' });

    await userRef.update({
      username,
      'stats/totalGames': ServerValue.increment(1),
      ...(result === 'win' ? { 'stats/wins': ServerValue.increment(1) } : {}),
    });
    await userRef.child('history').push({
      date: ServerValue.TIMESTAMP,
      result,
      mode: game.mode,
      ...(game.level ? { level: game.level } : {}),
      Options: game.victoryOptions,
    });

    return res.status(201).json({ result });
  } catch (error) {
    console.error('[games] Erreur Firebase :', error);
    return res.status(500).json({ error: "Impossible d'enregistrer la partie" });
  }
}
