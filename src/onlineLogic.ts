import type { GameState, Board, Piece } from './types';

/**
 * Online multiplayer logic using localStorage for demo purposes
 * In a production app, this would use WebSocket, WebRTC, or a real-time database
 */

export interface GameAction {
  type: 'PLACE_PIECE' | 'SELECT_PIECE';
  payload?: {
    row?: number;
    col?: number;
    piece?: Piece;
    board?: Board;
    availablePieces?: Piece[];
    currentPiece?: Piece | null;
    currentPlayer?: 1 | 2;
    winner?: 1 | 2 | null;
    gameOver?: boolean;
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

const STORAGE_PREFIX = 'quarto_room_';
const POLL_INTERVAL = 500; // Poll every 500ms for changes

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
export const createRoom = (): string => {
  const roomId = generateRoomId();
  const roomData: RoomData = {
    roomId,
    player1Connected: true,
    player2Connected: false,
    gameState: null,
    lastAction: null,
    createdAt: Date.now(),
  };
  
  localStorage.setItem(STORAGE_PREFIX + roomId, JSON.stringify(roomData));
  return roomId;
};

/**
 * Join an existing room
 * Returns true if successful, false if room doesn't exist or is full
 */
export const joinRoom = (roomId: string): boolean => {
  const roomData = getRoomData(roomId);
  if (!roomData) {
    return false;
  }
  
  if (roomData.player2Connected) {
    return false; // Room is full
  }
  
  roomData.player2Connected = true;
  localStorage.setItem(STORAGE_PREFIX + roomId, JSON.stringify(roomData));
  return true;
};

/**
 * Get room data from localStorage
 */
export const getRoomData = (roomId: string): RoomData | null => {
  const data = localStorage.getItem(STORAGE_PREFIX + roomId);
  if (!data) {
    return null;
  }
  
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

/**
 * Update room data in localStorage
 */
export const updateRoomData = (roomId: string, updates: Partial<RoomData>): void => {
  const roomData = getRoomData(roomId);
  if (!roomData) {
    return;
  }
  
  const updatedData = { ...roomData, ...updates };
  localStorage.setItem(STORAGE_PREFIX + roomId, JSON.stringify(updatedData));
};

/**
 * Send a game action to the room
 */
export const sendAction = (roomId: string, action: GameAction): void => {
  const roomData = getRoomData(roomId);
  if (!roomData) {
    return;
  }
  
  roomData.lastAction = action;
  localStorage.setItem(STORAGE_PREFIX + roomId, JSON.stringify(roomData));
};

/**
 * Update the full game state in the room
 */
export const updateGameState = (roomId: string, gameState: GameState): void => {
  updateRoomData(roomId, { gameState });
};

/**
 * Start polling for room updates
 * Returns a cleanup function to stop polling
 */
export const startPolling = (
  roomId: string,
  onUpdate: (roomData: RoomData) => void
): (() => void) => {
  let lastSequenceId = 0;
  
  const poll = () => {
    const roomData = getRoomData(roomId);
    if (!roomData) {
      return;
    }
    
    // Check if there's a new action based on sequence ID
    if (roomData.lastAction && roomData.lastAction.sequenceId > lastSequenceId) {
      lastSequenceId = roomData.lastAction.sequenceId;
      onUpdate(roomData);
    }
  };
  
  const intervalId = setInterval(poll, POLL_INTERVAL);
  
  // Initial poll
  poll();
  
  // Return cleanup function
  return () => {
    clearInterval(intervalId);
  };
};

/**
 * Leave a room and cleanup
 */
export const leaveRoom = (roomId: string, playerNumber: 1 | 2): void => {
  const roomData = getRoomData(roomId);
  if (!roomData) {
    return;
  }
  
  if (playerNumber === 1) {
    roomData.player1Connected = false;
  } else {
    roomData.player2Connected = false;
  }
  
  // If both players have left, delete the room
  if (!roomData.player1Connected && !roomData.player2Connected) {
    localStorage.removeItem(STORAGE_PREFIX + roomId);
  } else {
    localStorage.setItem(STORAGE_PREFIX + roomId, JSON.stringify(roomData));
  }
};

/**
 * Generate a unique room ID with collision detection
 */
const generateRoomId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if room already exists
    if (!localStorage.getItem(STORAGE_PREFIX + result)) {
      return result;
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
export const areBothPlayersConnected = (roomId: string): boolean => {
  const roomData = getRoomData(roomId);
  return roomData ? roomData.player1Connected && roomData.player2Connected : false;
};
