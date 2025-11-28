import React, { useState, useEffect } from 'react';
import styles from './StartMenu.module.css';
import { useGame } from '../context/GameContext'; // Import the custom hook
import HallOfFame from './HallOfFame';
import Accordion from './Accordion'; // Import the new component

const StartMenu = () => {
  // ... (component logic)

  return (
    <div>
      {/* ... (rest of the start menu controls) ... */}
      <button onClick={() => startGame(songCount, playlistUrl, decade)} className={styles.startGameButton}>
        Start Game
      </button>
      <Accordion title="Hall of Fame - Top 10">
        <HallOfFame />
      </Accordion>
    </div>
  );
};