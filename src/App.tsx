import React, { useState } from 'react';
import StartMenu from './components/StartMenu';
import SongBattle from './components/SongBattle';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [songCount, setSongCount] = useState(16);
  const [selectedPlaylistUrl, setSelectedPlaylistUrl] = useState<string | undefined>(undefined);

  const startGame = (count: number, playlistUrl?: string) => {
    setSongCount(count);
    setSelectedPlaylistUrl(playlistUrl);
    setGameStarted(true);
  };

  const resetGame = () => {
    setGameStarted(false);
    setSelectedPlaylistUrl(undefined); // Clear playlist URL for next game
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h1>Song Battle</h1>
      {gameStarted ? (
        <SongBattle songCount={songCount} playlistUrl={selectedPlaylistUrl} resetGame={resetGame} />
      ) : (
        <StartMenu startGame={startGame} />
      )}
    </div>
  );
}

export default App;
