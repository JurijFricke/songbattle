import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define the shape of the context state
interface GameState {
  gameStarted: boolean;
  songCount: number;
  playlistUrl?: string;
  decade?: string;
  startGame: (songCount: number, playlistUrl?: string, decade?: string) => void;
  resetGame: () => void;
}

// Create the context with a default undefined value
const GameContext = createContext<GameState | undefined>(undefined);

// Create a provider component
interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider = ({ children }: GameProviderProps) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [songCount, setSongCount] = useState(16);
  const [playlistUrl, setPlaylistUrl] = useState<string | undefined>(undefined);
  const [decade, setDecade] = useState<string | undefined>(undefined);

  const startGame = (count: number, url?: string, dec?: string) => {
    setSongCount(count);
    setPlaylistUrl(url);
    setDecade(dec === 'any' ? undefined : dec);
    setGameStarted(true);
  };

  const resetGame = () => {
    setGameStarted(false);
    // Keep playlistUrl and decade so they can be reused for "Play Again"
  };

  const value = {
    gameStarted,
    songCount,
    playlistUrl,
    decade,
    startGame,
    resetGame,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

// Create a custom hook for easy access to the context
export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
