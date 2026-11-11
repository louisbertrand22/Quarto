import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ServerValue, type Database } from 'firebase-admin/database';
import { authenticate } from './services/identity.js';
import { getAdminDatabase, getAdminFirestore, ROOM_ID, ROOMS, safeKey } from './services/firebaseAdmin.js';
import { encodeMoves, validateGame, type GameResult, type SubmittedMove } from './services/gameValidator.js';
import { DEFAULT_ELO, eloDelta } from './services/elo.js';

/** Délai minimal entre deux parties enregistrées pour un même joueur (anti-script). */
const MIN_INTERVAL_MS = 10_000;

interface Seat { id: string; username: string }
interface RoomSync { moves?: SubmittedMove[]; gameOver?: boolean; victoryOptions?: { squares?: boolean } }
interface Room {
  createdAt?: number;
  players?: { p1?: Seat; p2?: Seat };
  sync?: RoomSync | null;
  /** Partie précédente, conservée quand l'hôte lance la revanche */
  lastResult?: RoomSync | null;
}

/** Contexte d'une partie en ligne : lu dans la salle Firestore, pas dans la requête. */
interface OnlineContext {
  roomId: string;
  room: Room;
  me: 1 | 2;
}

const score = (result: GameResult) => (result === 'win' ? 1 : result === 'draw' ? 0.5 : 0);

/**
 * Applique le classement Elo une seule fois par partie, quel que soit le joueur qui l'envoie en premier.
 * Retourne la variation et le nouveau classement du joueur qui soumet.
 */
const applyElo = async (
  db: Database,
  ctx: OnlineContext,
  p1: Seat,
  p2: Seat,
  result: GameResult,
  movesKey: string,
): Promise<{ delta: number; elo: number }> => {
  const seats = { 1: p1, 2: p2 } as const;
  const stats = async (s: Seat) => {
    const snap = await db.ref(`users/${safeKey(s.id)}/stats`).get();
    const v = snap.val() ?? {};
    return { elo: typeof v.elo === 'number' ? v.elo : DEFAULT_ELO, rated: typeof v.ratedGames === 'number' ? v.ratedGames : 0 };
  };
  const [s1, s2] = await Promise.all([stats(p1), stats(p2)]);
  const myScore = score(result);
  const p1Score = ctx.me === 1 ? myScore : 1 - myScore;
  const deltas = {
    1: eloDelta(s1.elo, s2.elo, p1Score, s1.rated),
    2: eloDelta(s2.elo, s1.elo, 1 - p1Score, s2.rated),
  };

  // Verrou : la première soumission enregistre les deux variations, la seconde les relit
  const key = safeKey(`${ctx.roomId}_${ctx.room.createdAt ?? 0}_${movesKey}`).replace(/[:]/g, '_');
  const lock = await db.ref(`ratedGames/${key}`).transaction(cur =>
    cur ? undefined : { at: Date.now(), p1: { id: p1.id, delta: deltas[1] }, p2: { id: p2.id, delta: deltas[2] } }
  );

  if (lock.committed) {
    await Promise.all(([1, 2] as const).map(async n => {
      const ref = db.ref(`users/${safeKey(seats[n].id)}`);
      await ref.child('stats/elo').transaction((cur: number | null) => (cur ?? DEFAULT_ELO) + deltas[n]);
      await ref.update({ username: seats[n].username, 'stats/ratedGames': ServerValue.increment(1) });
    }));
  }

  const stored = lock.snapshot.val() as { p1: { delta: number }; p2: { delta: number } };
  const delta = ctx.me === 1 ? stored.p1.delta : stored.p2.delta;
  const eloSnap = await db.ref(`users/${safeKey(seats[ctx.me].id)}/stats/elo`).get();
  return { delta, elo: eloSnap.val() ?? DEFAULT_ELO + delta };
};

/**
 * POST /api/games — enregistre le résultat d'une partie terminée.
 * Le joueur est identifié par son jeton SSO, le résultat est recalculé à partir des coups.
 * En ligne, les coups doivent correspondre à la partie de la salle et le classement Elo des deux joueurs est mis à jour.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  // 1. Identité : vérifiée auprès du SSO, jamais prise dans le corps de la requête
  const who = await authenticate(req);
  if (!who.ok) return res.status(who.status).json({ error: who.error });
  const { userId, username } = who;

  // 2. En ligne : la salle fait foi pour la place du joueur et pour les coups
  let online: OnlineContext | null = null;
  if (req.body?.mode === 'online') {
    const roomId = typeof req.body.roomId === 'string' ? req.body.roomId.toUpperCase() : '';
    if (!ROOM_ID.test(roomId)) return res.status(422).json({ error: 'Partie invalide', reason: 'salle invalide' });
    try {
      const snap = await getAdminFirestore().collection(ROOMS).doc(roomId).get();
      if (!snap.exists) return res.status(422).json({ error: 'Partie invalide', reason: 'salle introuvable' });
      const room = snap.data() as Room;
      const { p1, p2 } = room.players ?? {};
      let me: 1 | 2 = req.body.playerNumber === 2 ? 2 : 1;
      if (p1?.id === userId) me = 1;
      else if (p2?.id === userId) me = 2;
      else if ((me === 1 ? p1 : p2) !== undefined) {
        return res.status(422).json({ error: 'Partie invalide', reason: "place occupée par quelqu'un d'autre" });
      }
      online = { roomId, room, me };
    } catch (error) {
      console.error('[games] Erreur Firestore :', error);
      return res.status(500).json({ error: 'Salle illisible' });
    }
  }

  // 3. Partie : rejouée coup par coup, le résultat est calculé ici
  const verdict = validateGame(online ? { ...req.body, playerNumber: online.me } : req.body);
  if (!verdict.ok) {
    console.warn(`[games] Partie refusée pour ${userId} : ${verdict.reason}`);
    return res.status(422).json({ error: 'Partie invalide', reason: verdict.reason });
  }
  const { result, game } = verdict;
  const movesKey = encodeMoves(game.moves);

  if (online) {
    // Les coups envoyés doivent être ceux de la salle (partie en cours ou précédente si la revanche a démarré)
    const found = [online.room.sync, online.room.lastResult].some(s =>
      s?.gameOver === true &&
      !!s.victoryOptions?.squares === game.victoryOptions.squares &&
      encodeMoves(s.moves ?? []) === movesKey
    );
    if (!found) {
      console.warn(`[games] Partie en ligne absente de la salle ${online.roomId} pour ${userId}`);
      return res.status(422).json({ error: 'Partie invalide', reason: 'partie absente de la salle' });
    }
  }

  try {
    const db = getAdminDatabase();
    const userRef = db.ref(`users/${safeKey(userId)}`);

    // 4. Limite de fréquence, atomique grâce à une transaction
    const now = Date.now();
    const tx = await userRef.child('lastGameAt').transaction((last: number | null) =>
      last && now - last < MIN_INTERVAL_MS ? undefined : now
    );
    if (!tx.committed) return res.status(429).json({ error: 'Trop de parties en peu de temps' });

    // Niveau Facile : l'IA joue au hasard, une partie inventée y serait invérifiable.
    // La partie reste dans l'historique (replay) mais ne compte pas dans les statistiques.
    const counted = !(game.mode === 'vs-ai' && game.level === 'easy');
    await userRef.update({
      username,
      ...(counted ? { 'stats/totalGames': ServerValue.increment(1) } : {}),
      ...(counted && result === 'win' ? { 'stats/wins': ServerValue.increment(1) } : {}),
    });

    // 5. Elo : seulement si les deux joueurs sont connectés et distincts
    let rating: { delta: number; elo: number } | null = null;
    let opponent: Seat | undefined;
    if (online) {
      const { p1, p2 } = online.room.players ?? {};
      opponent = online.me === 1 ? p2 : p1;
      if (p1 && p2 && p1.id !== p2.id) rating = await applyElo(db, online, p1, p2, result, movesKey);
    }

    await userRef.child('history').push({
      date: ServerValue.TIMESTAMP,
      result,
      mode: game.mode,
      ...(game.level ? { level: game.level } : {}),
      Options: game.victoryOptions,
      moves: movesKey,
      me: game.playerNumber ?? 1,
      ...(opponent ? { opponent: opponent.username } : {}),
      ...(rating ? { eloDelta: rating.delta } : {}),
      ...(counted ? {} : { unranked: true }),
    });

    return res.status(201).json({ result, counted, ...(rating ?? {}) });
  } catch (error) {
    console.error('[games] Erreur Firebase :', error);
    return res.status(500).json({ error: "Impossible d'enregistrer la partie" });
  }
}
