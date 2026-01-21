import type { Board, BoardCell, Piece } from './types';

/**
 * Check if 4 pieces share at least one common attribute using bitwise operations
 * Returns true if all 4 pieces have at least one bit in common (all set or all unset)
 */
const checkCommonAttribute = (p1: Piece, p2: Piece, p3: Piece, p4: Piece): boolean => {
  // Check each bit position (0-3) to see if all pieces share that attribute
  for (let bit = 0; bit < 4; bit++) {
    const mask = 1 << bit;
    
    // Check if all pieces have this bit set (all have this attribute)
    const allHaveBit = (p1 & mask) && (p2 & mask) && (p3 & mask) && (p4 & mask);
    
    // Check if no pieces have this bit set (all lack this attribute)
    const noneHaveBit = !(p1 & mask) && !(p2 & mask) && !(p3 & mask) && !(p4 & mask);
    
    // If either condition is true, they share this attribute
    if (allHaveBit || noneHaveBit) {
      return true;
    }
  }
  
  return false;
};

/**
 * Check victory condition on the board
 * Returns true if there are 4 pieces in a row (horizontal, vertical, or diagonal)
 * that share at least one common attribute
 */
export const checkVictory = (board: Board): boolean => {
  // Helper to check if a line of 4 cells contains a winning combination
  const checkLine = (cells: BoardCell[]): boolean => {
    // All cells must be filled
    if (cells.some(cell => cell === null)) return false;
    
    const pieces = cells as Piece[];
    return checkCommonAttribute(pieces[0], pieces[1], pieces[2], pieces[3]);
  };

  // Check horizontal lines
  for (let row = 0; row < 4; row++) {
    if (checkLine(board[row])) return true;
  }

  // Check vertical lines
  for (let col = 0; col < 4; col++) {
    const column = [board[0][col], board[1][col], board[2][col], board[3][col]];
    if (checkLine(column)) return true;
  }

  // Check diagonal (top-left to bottom-right)
  const diagonal1 = [board[0][0], board[1][1], board[2][2], board[3][3]];
  if (checkLine(diagonal1)) return true;

  // Check diagonal (top-right to bottom-left)
  const diagonal2 = [board[0][3], board[1][2], board[2][1], board[3][0]];
  if (checkLine(diagonal2)) return true;

  return false;
};

/**
 * Initialize an empty board
 */
export const initializeBoard = (): Board => {
  return Array(4).fill(null).map(() => Array(4).fill(null));
};

/**
 * Place a piece on the board at the specified position
 * Returns a new board with the piece placed
 */
export const placePiece = (board: Board, row: number, col: number, piece: Piece): Board => {
  const newBoard = board.map(r => [...r]);
  newBoard[row][col] = piece;
  return newBoard;
};

/**
 * Check if a position on the board is empty
 */
export const isPositionEmpty = (board: Board, row: number, col: number): boolean => {
  return board[row][col] === null;
};
