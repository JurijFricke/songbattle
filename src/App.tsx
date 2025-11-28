import React, { useState, Suspense, lazy } from 'react';
import StartMenu from './components/StartMenu';
import styles from './App.module.css';
import { GameProvider, useGame } from './context/GameContext';

const SongBattle = lazy(() => import('./components/SongBattle')); // Lazy load the component

// This component now decides which view to show based on context
const AppContent = () => {
  const { gameStarted } = useGame();

  return (
    <>
      <h1>Song Battle</h1>
      {gameStarted ? (
        <Suspense fallback={<div>Loading Game...</div>}>
          <SongBattle />
        </Suspense>
      ) : (
        <StartMenu />
      )}
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

