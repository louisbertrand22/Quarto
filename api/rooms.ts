import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from './services/identity.js';
import { getAdminFirestore, ROOM_ID, ROOMS } from './services/firebaseAdmin.js';

/**
 * POST /api/rooms — un joueur connecté prend sa place dans une salle en ligne.
 * L'identité vient du jeton SSO : c'est elle qui sert ensuite au classement Elo
 * (le navigateur ne peut pas annoncer qui est son adversaire).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const me = await authenticate(req);
  if (!me.ok) return res.status(me.status).json({ error: me.error });

  const roomId = typeof req.body?.roomId === 'string' ? req.body.roomId.toUpperCase() : '';
  const seat = req.body?.playerNumber;
  if (!ROOM_ID.test(roomId) || (seat !== 1 && seat !== 2)) return res.status(400).json({ error: 'Requête invalide' });

  try {
    const db = getAdminFirestore();
    const ref = db.collection(ROOMS).doc(roomId);
    const outcome = await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) return 404;
      const players = (snap.get('players') ?? {}) as Record<string, { id: string } | undefined>;
      const key = `p${seat}`;
      const other = players[seat === 1 ? 'p2' : 'p1'];
      if (players[key] && players[key]!.id !== me.userId) return 409;
      // Jouer contre soi-même (deux onglets) ne doit pas compter pour le classement
      if (other?.id === me.userId) return 409;
      tx.update(ref, { [`players.${key}`]: { id: me.userId, username: me.username } });
      return 200;
    });
    if (outcome !== 200) return res.status(outcome).json({ error: outcome === 404 ? 'Salle introuvable' : 'Place déjà prise' });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[rooms] Erreur Firestore :', error);
    return res.status(500).json({ error: 'Impossible de rejoindre la salle' });
  }
}
