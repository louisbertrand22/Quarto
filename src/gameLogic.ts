import type { Board, BoardCell, Piece, VictoryOptions } from './types';
import { BOARD_SIZE } from './types';

/**
 * Check if 4 pieces share at least one common attribute using bitwise operations
 * Returns true if all 4 pieces have at least one bit in common (all set or all unset)
 */
export const checkCommonAttribute = (p1: Piece, p2: Piece, p3: Piece, p4: Piece): boolean => {
  // Check each bit position (0-3) to see if all pieces share that attribute
  for (let bit = 0; bit < 4; bit++) {
    const mask = 1 << bit;
    
    // Check if all pieces have this bit set (all have this attribute)
    const allHaveBit = !!(p1 & mask) && !!(p2 & mask) && !!(p3 & mask) && !!(p4 & mask);
    
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
 * Check if 4 cells in a line contain a winning combination
 * All cells must be filled and share at least one common attribute
 */
const checkLine = (cells: BoardCell[]): boolean => {
  // All cells must be filled
  if (cells.some(cell => cell === null)) return false;
  
  const pieces = cells as Piece[];
  return checkCommonAttribute(pieces[0], pieces[1], pieces[2], pieces[3]);
};

/**
 * Check victory condition for lines (rows, columns, diagonals)
 * Returns true if there are 4 pieces in a row that share at least one common attribute
 */
const checkLinesVictory = (board: Board): boolean => {
  // Check horizontal lines
  for (let row = 0; row < BOARD_SIZE; row++) {
    if (checkLine(board[row])) return true;
  }

  // Check vertical lines
  for (let col = 0; col < BOARD_SIZE; col++) {
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
 * Check victory condition for 2x2 squares on the board
 * Returns true if there's a 2x2 square where all 4 pieces share at least one common attribute
 */
const checkSquaresVictory = (board: Board): boolean => {
  // Check all possible 2x2 squares on a 4x4 board
  // Number of 2x2 squares = (BOARD_SIZE - 1) * (BOARD_SIZE - 1) = 3 * 3 = 9
  for (let row = 0; row < BOARD_SIZE - 1; row++) {
    for (let col = 0; col < BOARD_SIZE - 1; col++) {
      const square = [
        board[row][col],
        board[row][col + 1],
        board[row + 1][col],
        board[row + 1][col + 1]
      ];
      
      if (checkLine(square)) return true;
    }
  }

  return false;
};

// Default victory options (classic Quarto with lines only)
const DEFAULT_VICTORY_OPTIONS: VictoryOptions = { lines: true, squares: false };

/**
 * Check victory condition on the board based on enabled victory options
 * Returns true if any enabled victory condition is met
 */
export const checkVictory = (board: Board, victoryOptions: VictoryOptions = DEFAULT_VICTORY_OPTIONS): boolean => {
  if (victoryOptions.lines && checkLinesVictory(board)) {
    return true;
  }

  if (victoryOptions.squares && checkSquaresVictory(board)) {
    return true;
  }

  return false;
};

/**
 * Initialize an empty board
 */
export const initializeBoard = (): Board => {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
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
