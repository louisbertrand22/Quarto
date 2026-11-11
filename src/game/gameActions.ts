import type { GameMode, GameState, Piece, VictoryOptions } from '../types';
import { generateAllPieces } from '../types';
import { checkVictory, initializeBoard, placePiece } from '../gameLogic';

/** État initial d'une partie. `firstPlayer` choisit la première pièce. */
export const createGameState = (
  mode: GameMode,
  victoryOptions: VictoryOptions,
  firstPlayer: 1 | 2 = 1,
  clockSeconds = 0
): GameState => ({
  board: initializeBoard(),
  availablePieces: generateAllPieces(),
  currentPiece: null,
  currentPlayer: firstPlayer,
  winner: null,
  gameOver: false,
  gameMode: mode,
  victoryOptions,
  moves: [],
  clocks: clockSeconds > 0 ? [clockSeconds, clockSeconds] : undefined,
});

/** Le joueur courant donne `piece` à son adversaire, qui devient le joueur courant. */
export const applyChoosePiece = (state: GameState, piece: Piece): GameState => ({
  ...state,
  currentPiece: piece,
  currentPlayer: state.currentPlayer === 1 ? 2 : 1,
  moves: [...(state.moves ?? []), { piece, givenBy: state.currentPlayer, cell: null }],
});

/** Le joueur courant pose la pièce en main ; il choisira ensuite la pièce suivante. */
export const applyPlacePiece = (state: GameState, row: number, col: number): GameState => {
  const piece = state.currentPiece;
  if (piece === null || state.board[row][col] !== null) return state;
  const board = placePiece(state.board, row, col, piece);
  const winningPositions = checkVictory(board, state.victoryOptions);
  const availablePieces = state.availablePieces.filter(p => p !== piece);
  const moves = [...(state.moves ?? [])];
  if (moves.length) moves[moves.length - 1] = { ...moves[moves.length - 1], cell: { row, col } };
  return {
    ...state,
    board,
    availablePieces,
    currentPiece: null,
    winner: winningPositions ? state.currentPlayer : null,
    gameOver: winningPositions !== null || availablePieces.length === 0,
    winningPositions: winningPositions ?? undefined,
    moves,
  };
};

/** Fin de partie au temps : le joueur courant a épuisé sa pendule. */
export const applyTimeout = (state: GameState): GameState => ({
  ...state,
  winner: state.currentPlayer === 1 ? 2 : 1,
  gameOver: true,
  timedOut: true,
});

/** Retire une seconde à la pendule du joueur courant ; perte au temps à zéro. */
export const tickClock = (state: GameState): GameState => {
  if (!state.clocks || state.gameOver) return state;
  const clocks: [number, number] = [...state.clocks];
  const k = state.currentPlayer - 1;
  clocks[k] = Math.max(0, clocks[k] - 1);
  const next = { ...state, clocks };
  return clocks[k] === 0 ? applyTimeout(next) : next;
};
