import React, { useState } from 'react';
import StartMenu from './components/StartMenu';
import SongBattle from './components/SongBattle';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [songCount, setSongCount] = useState(16);
  const [selectedPlaylistUrl, setSelectedPlaylistUrl] = useState<string | undefined>(undefined);
  const [decade, setDecade] = useState<string | undefined>(undefined);

  const startGame = (count: number, playlistUrl?: string, decade?: string) => {
    setSongCount(count);
    setSelectedPlaylistUrl(playlistUrl);
    setDecade(decade === 'any' ? undefined : decade); // Set decade, or undefined if 'any'
    setGameStarted(true);
  };

  const resetGame = () => {
    setGameStarted(false);
  };

  return (
    <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#f0f0f0' }}>
      <h1>Song Battle</h1>
      {gameStarted ? (
        <SongBattle songCount={songCount} playlistUrl={selectedPlaylistUrl} decade={decade} resetGame={resetGame} />
      ) : (
        <StartMenu startGame={startGame} initialPlaylistUrl={selectedPlaylistUrl} />
      )}
    </div>
  );
}

export default App;

