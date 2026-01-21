import type { GameState, Board, Piece } from './types';

/**
 * Online multiplayer logic using localStorage for demo purposes
 * In a production app, this would use WebSocket, WebRTC, or a real-time database
 */

export interface GameAction {
  type: 'PLACE_PIECE' | 'SELECT_PIECE' | 'RESET';
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
  let lastTimestamp = 0;
  
  const poll = () => {
    const roomData = getRoomData(roomId);
    if (!roomData) {
      return;
    }
    
    // Check if there's a new action
    if (roomData.lastAction && roomData.lastAction.timestamp > lastTimestamp) {
      lastTimestamp = roomData.lastAction.timestamp;
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
 * Generate a random room ID
 */
const generateRoomId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Check if both players are connected
 */
export const areBothPlayersConnected = (roomId: string): boolean => {
  const roomData = getRoomData(roomId);
  return roomData ? roomData.player1Connected && roomData.player2Connected : false;
};
