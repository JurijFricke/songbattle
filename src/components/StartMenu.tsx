import React, { useState } from 'react';

interface Props {
  startGame: (songCount: number, playlistUrl?: string) => void;
}

const StartMenu = ({ startGame }: Props) => {
  const [songCount, setSongCount] = useState(16);
  const [playlistUrl, setPlaylistUrl] = useState('');

  return (
    <div>
      <h2>Start Menu</h2>
      <div style={{ marginBottom: '30px' }}>
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
      <div style={{ marginTop: '20px' }}>
        <label htmlFor="playlist-url">Or paste a Spotify Playlist URL (optional):</label>
        <input
          key="playlist-url-input"
          id="playlist-url"
          type="text"
          value={playlistUrl}
          onChange={(e) => setPlaylistUrl(e.target.value)}
          placeholder="e.g., https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
          className="custom-input"
        />
      </div>
      <button onClick={() => startGame(songCount, playlistUrl)} className="start-game-button" style={{ marginTop: '20px' }}>
        Start Game
      </button>
    </div>
  );
};

export default StartMenu;