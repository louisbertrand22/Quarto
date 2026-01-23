import type { Board, BoardCell, Piece, VictoryOptions, WinningPosition } from './types';
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
 * Returns array of winning positions if there's a win, or null if no win
 */
const checkLinesVictory = (board: Board): WinningPosition[] | null => {
  // Check horizontal lines
  for (let row = 0; row < BOARD_SIZE; row++) {
    if (checkLine(board[row])) {
      return [
        { row, col: 0 },
        { row, col: 1 },
        { row, col: 2 },
        { row, col: 3 }
      ];
    }
  }

  // Check vertical lines
  for (let col = 0; col < BOARD_SIZE; col++) {
    const column = [board[0][col], board[1][col], board[2][col], board[3][col]];
    if (checkLine(column)) {
      return [
        { row: 0, col },
        { row: 1, col },
        { row: 2, col },
        { row: 3, col }
      ];
    }
  }

  // Check diagonal (top-left to bottom-right)
  const diagonal1 = [board[0][0], board[1][1], board[2][2], board[3][3]];
  if (checkLine(diagonal1)) {
    return [
      { row: 0, col: 0 },
      { row: 1, col: 1 },
      { row: 2, col: 2 },
      { row: 3, col: 3 }
    ];
  }

  // Check diagonal (top-right to bottom-left)
  const diagonal2 = [board[0][3], board[1][2], board[2][1], board[3][0]];
  if (checkLine(diagonal2)) {
    return [
      { row: 0, col: 3 },
      { row: 1, col: 2 },
      { row: 2, col: 1 },
      { row: 3, col: 0 }
    ];
  }

  return null;
};

/**
 * Check victory condition for 2x2 squares on the board
 * Returns array of winning positions if there's a win, or null if no win
 */
const checkSquaresVictory = (board: Board): WinningPosition[] | null => {
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
      
      if (checkLine(square)) {
        return [
          { row, col },
          { row, col: col + 1 },
          { row: row + 1, col },
          { row: row + 1, col: col + 1 }
        ];
      }
    }
  }

  return null;
};

// Default victory options (classic Quarto with lines only)
const DEFAULT_VICTORY_OPTIONS: VictoryOptions = { lines: true, squares: false };

/**
 * Check victory condition on the board based on enabled victory options
 * Returns array of winning positions if there's a win, or null if no win
 */
export const checkVictory = (board: Board, victoryOptions: VictoryOptions = DEFAULT_VICTORY_OPTIONS): WinningPosition[] | null => {
  if (victoryOptions.lines) {
    const lineWin = checkLinesVictory(board);
    if (lineWin) {
      return lineWin;
    }
  }

  if (victoryOptions.squares) {
    const squareWin = checkSquaresVictory(board);
    if (squareWin) {
      return squareWin;
    }
  }

  return null;
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

/**
 * Convert an object-like row structure to a proper array
 * Helper function for normalizeBoard
 */
const convertRowToArray = (rowObj: Record<string, BoardCell>): BoardCell[] => {
  return Array.from({ length: BOARD_SIZE }, (_, i) => 
    rowObj[i] !== undefined ? rowObj[i] : null
  );
};

/**
 * Normalize a board to ensure it's a proper 2D array structure
 * Firebase may convert arrays to objects, so we need to convert them back
 */
export const normalizeBoard = (board: Board | Record<string, unknown> | null | undefined): Board => {
  // If board is null or undefined, return an empty board
  if (!board) {
    return initializeBoard();
  }

  // If board is already a proper array, check if rows are also arrays
  if (Array.isArray(board)) {
    // Ensure each row is also an array and board has exactly BOARD_SIZE rows
    const normalizedBoard: Board = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      const row = board[i];
      if (Array.isArray(row)) {
        // Create a copy of the row and ensure all cells are valid (never undefined)
        normalizedBoard[i] = row.map(cell => (cell === undefined || cell === null) ? null : cell);
      } else if (row && typeof row === 'object') {
        // Convert object-like row to array
        normalizedBoard[i] = convertRowToArray(row as Record<string, BoardCell>);
      } else {
        // Fallback: return empty row
        normalizedBoard[i] = Array(BOARD_SIZE).fill(null);
      }
    }
    return normalizedBoard;
  }

  // If board is an object (Firebase converted array to object), convert it back
  if (board && typeof board === 'object') {
    const boardArray: Board = [];
    const boardObj = board as Record<string, unknown>;
    for (let i = 0; i < BOARD_SIZE; i++) {
      const rowData = boardObj[i];
      if (rowData) {
        if (Array.isArray(rowData)) {
          // Create a copy of the row and ensure all cells are valid (never undefined)
          boardArray[i] = rowData.map(cell => (cell === undefined || cell === null) ? null : cell);
        } else if (typeof rowData === 'object') {
          // Convert object-like row to array
          boardArray[i] = convertRowToArray(rowData as Record<string, BoardCell>);
        } else {
          boardArray[i] = Array(BOARD_SIZE).fill(null);
        }
      } else {
        boardArray[i] = Array(BOARD_SIZE).fill(null);
      }
    }
    return boardArray;
  }

  // Fallback: return an empty board
  return initializeBoard();
};

/**
 * Format a board for logging with visual representation
 * Returns a string showing the board in a grid format where:
 * - '.' represents an empty cell (null)
 * - Numbers are zero-padded to 2 digits representing piece values (00-15)
 * 
 * @param board - The board to format, can be null or undefined
 * @returns A formatted string representation of the board, one row per line
 * 
 * @example
 * // For a board with pieces 1, 5, and 13:
 * // . . 01 .
 * // 05 . . .
 * // . . 13 .
 * // . . . .
 */
export const formatBoardForLogging = (board: Board | null | undefined): string => {
  if (!board) {
    return 'NO BOARD';
  }
  
  try {
    const normalizedForDisplay = normalizeBoard(board);
    return normalizedForDisplay.map(row => 
      row.map(cell => {
        // Ensure cell is never undefined - treat it as null
        if (cell === undefined || cell === null) return '.';
        return cell.toString().padStart(2, '0');
      }).join(' ')
    ).join('\n');
  } catch (error) {
    return `ERROR formatting board: ${error}`;
  }
};
