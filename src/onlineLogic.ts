/**
 * Logique multijoueur en ligne — Firestore Real-time
 *
 * Pourquoi Firestore plutôt que Realtime Database ?
 * Firebase Realtime Database supprime silencieusement les valeurs null dans
 * les tableaux, corrompant notre board (ex: [[null,null,null,5]] → {0:{3:5}}).
 * Firestore préserve les null et garantit des mises à jour atomiques de document.
 *
 * La board est sérialisée en tableau 1D de 16 entiers (case vide = -1)
 * pour contourner l'interdiction Firestore des tableaux imbriqués.
 */

import type { GameState, Board, GameMode, WinningPosition } from './types';
import { firestore } from './firebaseConfig';
import {
  doc, setDoc, updateDoc, getDoc, onSnapshot, deleteDoc,
} from 'firebase/firestore';

const COLLECTION = 'onlineRooms';

// ── Sérialisation board ───────────────────────────────────────────────────────

const serializeBoard = (board: Board): number[] =>
  board.flat().map(cell => (cell === null ? -1 : cell));

const deserializeBoard = (flat: number[]): Board => {
  const result: Board = [];
  for (let i = 0; i < 4; i++) {
    result.push(
      flat.slice(i * 4, i * 4 + 4).map(v => (v === -1 ? null : v)) as (number | null)[]
    );
  }
  return result;
};

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * État du jeu sérialisé pour Firestore.
 * Atomiquement mis à jour via updateDoc({ sync: ... }).
 * Le champ `movedBy` permet à chaque client d'ignorer ses propres écritures.
 */
export interface SyncData {
  board: number[];                               // 16 entiers, -1 = vide
  availablePieces: number[];
  currentPiece: number | null;
  currentPlayer: 1 | 2;
  winner: 1 | 2 | null;
  gameOver: boolean;
  gameMode: string;
  victoryOptions: { lines: boolean; squares: boolean };
  winningPositions: { row: number; col: number }[] | null;
  movedBy: 1 | 2;
}

export interface RoomData {
  roomId: string;
  player1Connected: boolean;
  player2Connected: boolean;
  sync: SyncData | null;
  createdAt: number;
}

// ── Conversion GameState ↔ SyncData ─────────────────────────────────────────

export const gameStateToSync = (state: GameState, movedBy: 1 | 2): SyncData => ({
  board: serializeBoard(state.board),
  availablePieces: state.availablePieces,
  currentPiece: state.currentPiece,
  currentPlayer: state.currentPlayer,
  winner: state.winner,
  gameOver: state.gameOver,
  gameMode: state.gameMode,
  victoryOptions: state.victoryOptions,
  winningPositions: state.winningPositions ?? null,
  movedBy,
});

export const syncToGameState = (sync: SyncData): Omit<GameState, 'onlineRoom'> => ({
  board: deserializeBoard(sync.board),
  availablePieces: sync.availablePieces,
  currentPiece: sync.currentPiece,
  currentPlayer: sync.currentPlayer,
  winner: sync.winner,
  gameOver: sync.gameOver,
  gameMode: sync.gameMode as GameMode,
  victoryOptions: sync.victoryOptions,
  winningPositions: (sync.winningPositions ?? undefined) as WinningPosition[] | undefined,
});

// ── API Firestore ─────────────────────────────────────────────────────────────

export const createRoom = async (): Promise<string> => {
  const roomId = await generateRoomId();
  const roomData: RoomData = {
    roomId,
    player1Connected: true,
    player2Connected: false,
    sync: null,
    createdAt: Date.now(),
  };
  await setDoc(doc(firestore, COLLECTION, roomId), roomData);
  return roomId;
};

export const joinRoom = async (roomId: string): Promise<boolean> => {
  const id = roomId.toUpperCase();
  const snap = await getDoc(doc(firestore, COLLECTION, id));
  if (!snap.exists()) return false;
  const data = snap.data() as RoomData;
  if (data.player2Connected) return false;
  await updateDoc(doc(firestore, COLLECTION, id), { player2Connected: true });
  return true;
};

/**
 * Écrit l'état du jeu dans Firestore en une seule opération atomique (updateDoc).
 * Un seul événement onSnapshot déclenché chez les clients → pas de race condition.
 */
export const updateGameState = async (
  roomId: string,
  gameState: GameState,
  movedBy: 1 | 2
): Promise<void> => {
  const id = roomId.toUpperCase();
  const sync = gameStateToSync(gameState, movedBy);
  await updateDoc(doc(firestore, COLLECTION, id), { sync });
};

/**
 * Écoute les mises à jour en temps réel via Firestore onSnapshot.
 * Retourne la fonction de désabonnement.
 */
export const startPolling = (
  roomId: string,
  onUpdate: (roomData: RoomData) => void
): (() => void) => {
  const id = roomId.toUpperCase();
  return onSnapshot(
    doc(firestore, COLLECTION, id),
    (snap) => { if (snap.exists()) onUpdate(snap.data() as RoomData); },
    (err) => console.error('[Firestore] onSnapshot error:', err)
  );
};

export const leaveRoom = async (roomId: string, playerNumber: 1 | 2): Promise<void> => {
  const id = roomId.toUpperCase();
  const snap = await getDoc(doc(firestore, COLLECTION, id));
  if (!snap.exists()) return;
  const data = snap.data() as RoomData;
  const otherConnected = playerNumber === 1 ? data.player2Connected : data.player1Connected;
  if (!otherConnected) {
    await deleteDoc(doc(firestore, COLLECTION, id));
  } else {
    const field = playerNumber === 1 ? 'player1Connected' : 'player2Connected';
    await updateDoc(doc(firestore, COLLECTION, id), { [field]: false });
  }
};

/** Vérifie la connexion des deux joueurs directement depuis les données du snapshot */
export const areBothPlayersConnected = (roomData: RoomData): boolean =>
  roomData.player1Connected && roomData.player2Connected;

// ── Génération ID salle ───────────────────────────────────────────────────────

const generateRoomId = async (): Promise<string> => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let attempt = 0; attempt < 10; attempt++) {
    let id = '';
    for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
    const snap = await getDoc(doc(firestore, COLLECTION, id));
    if (!snap.exists()) return id;
  }
  return Date.now().toString(36).toUpperCase().slice(-6).padStart(6, '0');
};
