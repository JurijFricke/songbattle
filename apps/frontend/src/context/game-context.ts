import { createContext } from "react";
import type { BattleSource } from "@songbattle/contracts";

export interface GameState {
  gameStarted: boolean;
  songCount: number;
  source: BattleSource | null;
  startGame: (songCount: number, source: BattleSource) => void;
  resetGame: () => void;
}

export const GameContext = createContext<GameState | undefined>(undefined);
