import { useCallback, useState, type ReactNode } from "react";
import type { BattleSource } from "@songbattle/contracts";
import { GameContext } from "./game-context";

interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider = ({ children }: GameProviderProps) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [songCount, setSongCount] = useState(16);
  const [source, setSource] = useState<BattleSource | null>(null);

  const startGame = useCallback((count: number, nextSource: BattleSource) => {
    setSongCount(count);
    setSource(nextSource);
    setGameStarted(true);
  }, []);

  const resetGame = useCallback(() => {
    setGameStarted(false);
  }, []);

  return (
    <GameContext.Provider
      value={{ gameStarted, songCount, source, startGame, resetGame }}
    >
      {children}
    </GameContext.Provider>
  );
};
