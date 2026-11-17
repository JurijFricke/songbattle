import React, { Suspense, lazy } from "react";
import StartMenu from "./components/StartMenu";
import styles from "./App.module.css";
import { GameProvider } from "./context/GameContext";
import { useGame } from "./context/useGame";

const SongBattle = lazy(() => import("./components/SongBattle")); // Lazy load the component

// This component now decides which view to show based on context
const AppContent = () => {
  const { gameStarted } = useGame();

  return (
    <>
      <a className="skipLink" href="#main-content">
        Skip to main content
      </a>
      <header className={styles.appHeader}>
        <p className={styles.eyebrow}>Spotify-powered tournament</p>
        <h1>Song Battle</h1>
        <p className={styles.subtitle}>
          Listen first. Choose carefully. Crown a champion.
        </p>
      </header>
      <main id="main-content" className={styles.mainContent} tabIndex={-1}>
        {gameStarted ? (
          <Suspense fallback={<div role="status">Loading game...</div>}>
            <SongBattle />
          </Suspense>
        ) : (
          <StartMenu />
        )}
      </main>
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
