/// <reference lib="webworker" />
import { analyzeGame } from '../aiLogic';
import type { Move, VictoryOptions } from '../types';

// Analyse hors du fil principal : le solveur peut prendre une à deux secondes en fin de partie
self.onmessage = (e: MessageEvent<{ moves: Move[]; victoryOptions: VictoryOptions }>) => {
  self.postMessage(analyzeGame(e.data.moves, e.data.victoryOptions));
};
