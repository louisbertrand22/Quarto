// Bitwise flags for piece attributes
export const PieceAttributes = {
  // Color: Light (0) / Dark (1)
  DARK: 1 << 0,  // 0001
  
  // Shape: Square (0) / Round (1)
  ROUND: 1 << 1, // 0010
  
  // Size: Short (0) / Tall (1)
  TALL: 1 << 2,  // 0100
  
  // Top: Solid (0) / Hollow (1)
  HOLLOW: 1 << 3 // 1000
} as const;

// Board dimensions
export const BOARD_SIZE = 4;

// A piece is represented by a 4-bit number (0-15)
// Each bit represents a binary characteristic
export type Piece = number;

// Board position (null means empty)
export type BoardCell = Piece | null;

// 4x4 board
export type Board = BoardCell[][];

// Position on the board
export interface WinningPosition {
  row: number;
  col: number;
}

// Game mode
export type GameMode = 'two-player' | 'vs-ai' | 'online';

// Victory options configuration
export interface VictoryOptions {
  lines: boolean;    // Check rows, columns, and diagonals (default win condition)
  squares: boolean;  // Check 2x2 squares on the board
}

// Online game room info
export interface OnlineRoomInfo {
  roomId: string;
  playerNumber: 1 | 2;  // Which player this client is (1 or 2)
  isHost: boolean;
}

// Game state
export interface GameState {
  board: Board;
  availablePieces: Piece[];
  currentPiece: Piece | null; // The piece chosen for the current player
  currentPlayer: 1 | 2;
  winner: 1 | 2 | null;
  gameOver: boolean;
  gameMode: GameMode;
  victoryOptions: VictoryOptions;
  onlineRoom?: OnlineRoomInfo;  // Only present in online mode
  winningPositions?: WinningPosition[];  // Positions of the winning pieces
}

// Generate all 16 possible pieces (0000 to 1111 in binary)
export const generateAllPieces = (): Piece[] => {
  return Array.from({ length: 16 }, (_, i) => i);
};

// Helper functions to check piece attributes
export const isDark = (piece: Piece): boolean => (piece & PieceAttributes.DARK) !== 0;
export const isRound = (piece: Piece): boolean => (piece & PieceAttributes.ROUND) !== 0;
export const isTall = (piece: Piece): boolean => (piece & PieceAttributes.TALL) !== 0;
export const isHollow = (piece: Piece): boolean => (piece & PieceAttributes.HOLLOW) !== 0;
