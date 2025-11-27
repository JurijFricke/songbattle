import React, { useState, useEffect } from 'react';

interface Props {
  startGame: (songCount: number, playlistUrl?: string, decade?: string) => void;
  initialPlaylistUrl?: string;
}

const StartMenu = ({ startGame, initialPlaylistUrl }: Props) => {
  const [songCount, setSongCount] = useState(16);
  const [playlistUrl, setPlaylistUrl] = useState(initialPlaylistUrl || '');
  const [decade, setDecade] = useState('any');

  useEffect(() => {
    setPlaylistUrl(initialPlaylistUrl || '');
  }, [initialPlaylistUrl]);

  return (
    <div>
      <h2>Start Menu</h2>
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="song-count">Select number of songs:</label>
        <select
          id="song-count"
          value={songCount}
          onChange={(e) => setSongCount(parseInt(e.target.value))}
          className="custom-select"
        >
          <option value="16">16</option>
          <option value="32">32</option>
          <option value="64">64</option>
          <option value="128">128</option>
          <option value="256">256</option>
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="decade-select">Select Decade (optional):</label>
        <select
          id="decade-select"
          value={decade}
          onChange={(e) => setDecade(e.target.value)}
          className="custom-select"
          disabled={!!playlistUrl} // Disable if a playlist URL is entered
        >
          <option value="any">Any</option>
          <option value="2020s">2020s</option>
          <option value="2010s">2010s</option>
          <option value="2000s">2000s</option>
          <option value="1990s">1990s</option>
          <option value="1980s">1980s</option>
          <option value="1970s">1970s</option>
        </select>
      </div>

      <div style={{ marginTop: '20px' }}>
        <label htmlFor="playlist-url">Or paste a Spotify URL (Playlist or Track):</label>
        <input
          key="playlist-url-input"
          id="playlist-url"
          type="text"
          value={playlistUrl}
          onChange={(e) => setPlaylistUrl(e.target.value)}
          placeholder="e.g., .../playlist/..."
          className="custom-input"
        />
      </div>
      <button onClick={() => startGame(songCount, playlistUrl, decade)} className="start-game-button" style={{ marginTop: '20px' }}>
        Start Game
      </button>
    </div>
  );
};

export default StartMenu;