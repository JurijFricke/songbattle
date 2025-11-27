import React from 'react';
import StartMenu from './components/StartMenu';
import SongBattle from './components/SongBattle';
import styles from './App.module.css';
import { GameProvider, useGame } from './context/GameContext';

// This component now decides which view to show based on context
const AppContent = () => {
  const { gameStarted } = useGame();

  return (
    <>
      <h1>Song Battle</h1>
      {gameStarted ? <SongBattle /> : <StartMenu />}
    </>
  );
};

function App() {
  return (
    <GameProvider>
      <div className={styles.appContainer}>
        <AppContent />
      </div>
    </GameProvider>
  );
}

export default App;

