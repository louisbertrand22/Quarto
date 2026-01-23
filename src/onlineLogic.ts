import type { GameState, Board, Piece } from './types';
import { database } from './firebaseConfig';
import { ref, set, get, update, remove, onValue } from 'firebase/database';
import { normalizeBoard, formatBoardForLogging } from './gameLogic';

/**
 * Online multiplayer logic using Firebase Realtime Database
 * This enables real-time multiplayer across different devices
 */

// Debug flag for Firebase logging
// Set to false to disable verbose logging in production
const DEBUG_FIREBASE = false;

export interface GameAction {
  type: 'PLACE_PIECE' | 'SELECT_PIECE';
  payload: {
    // For PLACE_PIECE: row, col, and piece being placed
    row?: number;
    col?: number;
    piece?: Piece;
    // For SELECT_PIECE: only the piece being selected
    // piece is defined above
  };
  timestamp: number;
  sequenceId: number;  // Added to prevent timestamp collisions
}

export interface RoomData {
  roomId: string;
  player1Connected: boolean;
  player2Connected: boolean;
  gameState: GameState | null;
  lastAction: GameAction | null;
  createdAt: number;
}

const ROOMS_PATH = 'rooms';

let actionSequence = 0;  // Global sequence counter for actions

/**
 * Get the next sequence ID for actions
 */
export const getNextSequenceId = (): number => {
  return ++actionSequence;
};

/**
 * Create a new online room and return the room ID
 */
export const createRoom = async (): Promise<string> => {
  const roomId = await generateRoomId();
  const normalizedRoomId = roomId.toUpperCase();
  const roomData: RoomData = {
    roomId: normalizedRoomId,
    player1Connected: true,
    player2Connected: false,
    gameState: null,
    lastAction: null,
    createdAt: Date.now(),
  };
  
  const roomRef = ref(database, `${ROOMS_PATH}/${normalizedRoomId}`);
  await set(roomRef, roomData);
  return normalizedRoomId;
};

/**
 * Join an existing room
 * Returns true if successful, false if room doesn't exist or is full
 */
export const joinRoom = async (roomId: string): Promise<boolean> => {
  const normalizedRoomId = roomId.toUpperCase();
  const roomData = await getRoomData(normalizedRoomId);
  if (!roomData) {
    return false;
  }
  
  if (roomData.player2Connected) {
    return false; // Room is full
  }
  
  const roomRef = ref(database, `${ROOMS_PATH}/${normalizedRoomId}`);
  await update(roomRef, { player2Connected: true });
  return true;
};

/**
 * Get room data from Firebase
 */
export const getRoomData = async (roomId: string): Promise<RoomData | null> => {
  const normalizedRoomId = roomId.toUpperCase();
  const roomRef = ref(database, `${ROOMS_PATH}/${normalizedRoomId}`);
  
  try {
    const snapshot = await get(roomRef);
    if (snapshot.exists()) {
      return snapshot.val() as RoomData;
    }
    return null;
  } catch (error) {
    console.error('Error getting room data:', error);
    return null;
  }
};

/**
 * Update room data in Firebase
 */
export const updateRoomData = async (roomId: string, updates: Partial<RoomData>): Promise<void> => {
  const normalizedRoomId = roomId.toUpperCase();
  const roomRef = ref(database, `${ROOMS_PATH}/${normalizedRoomId}`);
  
  try {
    // Remove undefined values from the updates before sending to Firebase
    const cleanUpdates = removeUndefined(updates);
    await update(roomRef, cleanUpdates);
  } catch (error) {
    console.error('Error updating room data:', error);
  }
};

/**
 * Remove undefined values from an object recursively
 * Firebase doesn't accept undefined values in updates
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const removeUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
  }
  
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      const value = obj[key];
      if (value !== null && typeof value === 'object') {
        result[key] = removeUndefined(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
};

/**
 * Send a game action to the room
 */
export const sendAction = async (roomId: string, action: GameAction): Promise<void> => {
  const normalizedRoomId = roomId.toUpperCase();
  const roomRef = ref(database, `${ROOMS_PATH}/${normalizedRoomId}`);
  
  try {
    // Remove undefined values from the action before sending to Firebase
    const cleanAction = removeUndefined(action) as GameAction;
    await update(roomRef, { lastAction: cleanAction });
  } catch (error) {
    console.error('Error sending action:', error);
  }
};

/**
 * Update the full game state in the room
 * Note: onlineRoom field is excluded as it's client-specific
 */
export const updateGameState = async (roomId: string, gameState: GameState): Promise<void> => {
  const normalizedRoomId = roomId.toUpperCase();
  // Remove onlineRoom field before storing to Firebase since it's client-specific
  // Each client should maintain their own onlineRoom information locally
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { onlineRoom, ...stateToStore } = gameState;
  
  // Explicitly ensure board is included and is a proper 2D array
  // This is critical for synchronization between players
  if (!stateToStore.board || !Array.isArray(stateToStore.board)) {
    console.error('[Firebase] ERROR: Board is missing or not an array!', stateToStore.board);
    throw new Error('Cannot update game state without a valid board');
  }
  
  // Normalize the board before sending to ensure it's in the correct format
  // This prevents any potential serialization issues with Firebase
  // Uses the existing normalizeBoard function to ensure consistency
  const normalizedBoard: Board = normalizeBoard(stateToStore.board);
  
  // Update the state with normalized board
  const stateWithNormalizedBoard = {
    ...stateToStore,
    board: normalizedBoard
  };
  
  if (DEBUG_FIREBASE) {
    console.log(`[Firebase] Updating game state for room ${normalizedRoomId}:`, {
      currentPiece: stateWithNormalizedBoard.currentPiece,
      currentPlayer: stateWithNormalizedBoard.currentPlayer,
      gameOver: stateWithNormalizedBoard.gameOver,
      hasBoard: true,
      boardRows: normalizedBoard.length,
      boardFilledCells: normalizedBoard.flat().filter(cell => cell !== null).length
    });
    console.log('[Firebase] Board being sent:');
    console.log(formatBoardForLogging(normalizedBoard));
  }
  
  // Use set() instead of update() for the gameState path to ensure proper board serialization
  // Firebase's update() can have issues with nested arrays containing null values
  // set() replaces the entire gameState atomically, preventing array-to-object conversion
  const roomRef = ref(database, `${ROOMS_PATH}/${normalizedRoomId}/gameState`);
  const cleanState = removeUndefined(stateWithNormalizedBoard);
  
  try {
    await set(roomRef, cleanState);
  } catch (error) {
    console.error('Error updating game state:', error);
    throw error; // Re-throw to allow caller to handle the error
  }
};

/**
 * Start listening for room updates using Firebase real-time listeners
 * Returns a cleanup function to stop listening
 */
export const startPolling = (
  roomId: string,
  onUpdate: (roomData: RoomData) => void
): (() => void) => {
  const normalizedRoomId = roomId.toUpperCase();
  const roomRef = ref(database, `${ROOMS_PATH}/${normalizedRoomId}`);
  
  if (DEBUG_FIREBASE) console.log(`[Firebase] Setting up real-time listener for room: ${normalizedRoomId}`);
  // Set up real-time listener
  const unsubscribe = onValue(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      const roomData = snapshot.val() as RoomData;
      if (DEBUG_FIREBASE) {
        console.log(`[Firebase] Room data updated for ${normalizedRoomId}:`, {
          hasGameState: !!roomData.gameState,
          currentPiece: roomData.gameState?.currentPiece,
          currentPlayer: roomData.gameState?.currentPlayer,
          player1Connected: roomData.player1Connected,
          player2Connected: roomData.player2Connected,
        });
      }
      onUpdate(roomData);
    } else {
      if (DEBUG_FIREBASE) console.log(`[Firebase] Room ${normalizedRoomId} no longer exists`);
    }
  }, (error) => {
    console.error('Error listening to room updates:', error);
  });
  
  // Return cleanup function
  return unsubscribe;
};

/**
 * Leave a room and cleanup
 */
export const leaveRoom = async (roomId: string, playerNumber: 1 | 2): Promise<void> => {
  const normalizedRoomId = roomId.toUpperCase();
  const roomData = await getRoomData(normalizedRoomId);
  if (!roomData) {
    return;
  }
  
  const updates: Partial<RoomData> = {};
  if (playerNumber === 1) {
    updates.player1Connected = false;
  } else {
    updates.player2Connected = false;
  }
  
  // Check if both players have left to determine if room should be deleted
  const bothPlayersDisconnected = 
    (playerNumber === 1 && !roomData.player2Connected) || 
    (playerNumber === 2 && !roomData.player1Connected);
  
  if (bothPlayersDisconnected) {
    const roomRef = ref(database, `${ROOMS_PATH}/${normalizedRoomId}`);
    await remove(roomRef);
  } else {
    await updateRoomData(normalizedRoomId, updates);
  }
};

/**
 * Generate a unique room ID with collision detection
 */
const generateRoomId = async (): Promise<string> => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if room already exists (case-insensitive)
    const roomId = result.toUpperCase();
    const roomData = await getRoomData(roomId);
    if (!roomData) {
      return roomId;
    }
    
    attempts++;
  }
  
  // Fallback: use timestamp to ensure uniqueness
  const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
  return timestamp.padStart(6, '0');
};

/**
 * Check if both players are connected
 */
export const areBothPlayersConnected = async (roomId: string): Promise<boolean> => {
  const normalizedRoomId = roomId.toUpperCase();
  const roomData = await getRoomData(normalizedRoomId);
  return roomData ? roomData.player1Connected && roomData.player2Connected : false;
};
