import React, { useState, useEffect } from 'react';
import styles from './StartMenu.module.css';
import { useGame } from '../context/GameContext'; // Import the custom hook
import HallOfFame from './HallOfFame';
import Accordion from './Accordion'; // Import the new component

const StartMenu = () => {
  const { startGame, playlistUrl: initialPlaylistUrl } = useGame(); // Get what's needed from context

  const [songCount, setSongCount] = useState(16);
  const [playlistUrl, setPlaylistUrl] = useState(initialPlaylistUrl || '');
  const [decade, setDecade] = useState('any');

  useEffect(() => {
    setPlaylistUrl(initialPlaylistUrl || '');
  }, [initialPlaylistUrl]);

  return (
    <div>
      <h2>Start Menu</h2>
      <div className={styles.startMenuSection}>
        <label htmlFor="song-count">Select number of songs:</label>
        <select
          id="song-count"
          value={songCount}
          onChange={(e) => setSongCount(parseInt(e.target.value))}
          className={styles.customSelect}
        >
          <option value="16">16</option>
          <option value="32">32</option>
          <option value="64">64</option>
          <option value="128">128</option>
          <option value="256">256</option>
        </select>
      </div>

      <div className={styles.startMenuSection}>
        <label htmlFor="decade-select">Select Decade (optional):</label>
        <select
          id="decade-select"
          value={decade}
          onChange={(e) => setDecade(e.target.value)}
          className={styles.customSelect}
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

      <div className={styles.startMenuSection}>
        <label htmlFor="playlist-url">Or paste a Spotify Playlist URL (optional):</label>
        <input
          key="playlist-url-input"
          id="playlist-url"
          type="text"
          value={playlistUrl}
          onChange={(e) => setPlaylistUrl(e.target.value)}
          placeholder="e.g., https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
          className={styles.customInput}
        />
      </div>
      <button onClick={() => startGame(songCount, playlistUrl, decade)} className={styles.startGameButton}>
        Start Game
      </button>
      <Accordion title="Hall of Fame - Top 10">
        <HallOfFame />
      </Accordion>
    </div>
  );
};

export default StartMenu;