import { useEffect, useState } from 'react';
import ReactConfetti from 'react-confetti';
import type { Song, SongStats } from '@songbattle/contracts';
import { completeBattleAPI, fetchSongStatsAPI, fetchSongsAPI, saveBattleVoteAPI } from '../services/api';
import { useGame } from '../context/GameContext';
import ProgressBar from './ProgressBar';
import SpotifyPlayer from './SpotifyPlayer';
import Accordion from './Accordion';
import HallOfFame from './HallOfFame';
import styles from './SongBattle.module.css';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'The songs could not be loaded. Please try again.';

const formatDuration = (durationMs: number): string => {
  const totalSeconds = Math.round(durationMs / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
};

const SongBattle = () => {
  const { songCount, source, resetGame } = useGame();
  const [round, setRound] = useState(1);
  const [contenders, setContenders] = useState<Song[]>([]);
  const [nextContenders, setNextContenders] = useState<Song[]>([]);
  const [winner, setWinner] = useState<Song | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentBattleIndex, setCurrentBattleIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBattleLoading, setIsBattleLoading] = useState(false);
  const [lastClickedButtonId, setLastClickedButtonId] = useState<string | null>(null);
  const [currentWinnerId, setCurrentWinnerId] = useState<string | null>(null);
  const [currentLoserId, setCurrentLoserId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [winnerStats, setWinnerStats] = useState<SongStats | null>(null);
  const [isWinnerStatsLoading, setIsWinnerStatsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadSongs = async (): Promise<void> => {
      if (!source) {
        setError('No battle source was selected.');
        return;
      }
      setError(null);
      setIsLoading(true);
      try {
        const response = await fetchSongsAPI(songCount, source);
        if (cancelled) return;
        setContenders(response.songs);
        setSessionId(response.sessionId);
        if (response.warning) setError(response.warning);
      } catch (loadError) {
        if (!cancelled) setError(errorMessage(loadError));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void loadSongs();
    return () => { cancelled = true; };
  }, [songCount, source]);

  useEffect(() => {
    if (!winner) return;
    setShowConfetti(true);
    const timer = window.setTimeout(() => setShowConfetti(false), 10_000);
    return () => window.clearTimeout(timer);
  }, [winner]);

  useEffect(() => {
    if (!winner) return;
    let cancelled = false;
    setIsWinnerStatsLoading(true);
    void fetchSongStatsAPI(winner.id)
      .then((stats) => {
        if (!cancelled) setWinnerStats(stats);
      })
      .catch((statsError: unknown) => {
        if (!cancelled) setError(errorMessage(statsError));
      })
      .finally(() => {
        if (!cancelled) setIsWinnerStatsLoading(false);
      });
    return () => { cancelled = true; };
  }, [winner]);

  const handleVote = (selectedSong: Song): void => {
    const song1 = contenders[currentBattleIndex];
    const song2 = contenders[currentBattleIndex + 1];
    if (!song1 || !song2 || !sessionId) return;

    const loserSong = selectedSong.id === song1.id ? song2 : song1;
    void saveBattleVoteAPI({
      sessionId,
      matchupNumber: Math.floor(currentBattleIndex / 2) + 1,
      winnerSongId: selectedSong.id,
      loserSongId: loserSong.id,
    }).catch((voteError: unknown) => setError(errorMessage(voteError)));

    setLastClickedButtonId(selectedSong.id);
    setCurrentWinnerId(selectedSong.id);
    setCurrentLoserId(loserSong.id);
    setIsBattleLoading(true);

    window.setTimeout(() => {
      const newNextContenders = [...nextContenders, selectedSong];
      const nextBattleIndex = currentBattleIndex + 2;
      let updatedContenders = contenders;
      let updatedRound = round;
      let updatedNextContenders: Song[] = [];
      let updatedCurrentBattleIndex = 0;
      let nextGameWinner: Song | null = null;

      if (nextBattleIndex < contenders.length) {
        updatedCurrentBattleIndex = nextBattleIndex;
        updatedNextContenders = newNextContenders;
      } else if (newNextContenders.length === 1) {
        nextGameWinner = newNextContenders[0] ?? null;
      } else {
        updatedRound = round + 1;
        updatedContenders = newNextContenders;
      }

      setLastClickedButtonId(null);
      setCurrentWinnerId(null);
      setCurrentLoserId(null);
      setContenders(updatedContenders);
      setRound(updatedRound);
      setNextContenders(updatedNextContenders);
      setCurrentBattleIndex(updatedCurrentBattleIndex);
      setWinner(nextGameWinner);
      setIsBattleLoading(false);

      if (nextGameWinner && sessionId) {
        void completeBattleAPI(sessionId, nextGameWinner.id).catch((completeError: unknown) => {
          setError(errorMessage(completeError));
        });
      }
    }, 300);
  };

  if (winner) {
    return (
      <section className={styles.winnerSection} aria-labelledby="winner-heading">
        {showConfetti && <ReactConfetti recycle={false} numberOfPieces={350} />}
        <h2 id="winner-heading">Winner!</h2>
        <article className={styles.winnerCard}>
          {winner.album.imageUrl && (
            <img className={styles.winnerArtwork} src={winner.album.imageUrl} alt={`Album artwork for ${winner.album.name}`} />
          )}
          <div className={styles.winnerDetails}>
            <h3>{winner.title}</h3>
            <p className={styles.winnerArtists}>{winner.artists.join(', ')}</p>
            <dl className={styles.songDetails}>
              <div><dt>Album</dt><dd>{winner.album.name}</dd></div>
              {winner.releaseDate && <div><dt>Released</dt><dd>{winner.releaseDate}</dd></div>}
              <div><dt>Duration</dt><dd>{formatDuration(winner.durationMs)}</dd></div>
              <div><dt>Spotify popularity</dt><dd>{winner.popularity}/100</dd></div>
            </dl>
          </div>
        </article>
        <SpotifyPlayer song={winner} />
        <section className={styles.performanceCard} aria-labelledby="performance-heading">
          <h3 id="performance-heading">Tournament performance</h3>
          {isWinnerStatsLoading && <p role="status">Loading performance statistics...</p>}
          {!isWinnerStatsLoading && winnerStats && (
            <dl className={styles.performanceStats}>
              <div><dt>Wins</dt><dd>{winnerStats.wins}</dd></div>
              <div><dt>Losses</dt><dd>{winnerStats.losses}</dd></div>
              <div><dt>Appearances</dt><dd>{winnerStats.appearances}</dd></div>
              <div><dt>Win rate</dt><dd>{Math.round(winnerStats.winRate * 100)}%</dd></div>
            </dl>
          )}
          {!isWinnerStatsLoading && !winnerStats && <p>No recorded performance statistics yet.</p>}
        </section>
        <Accordion title="Hall of Fame">
          <HallOfFame />
        </Accordion>
        <button type="button" onClick={resetGame} className={styles.playAgainButton}>Play Again</button>
      </section>
    );
  }

  if (isLoading) return <ProgressBar current={0} total={1} label="Loading songs..." />;
  if (contenders.length === 0) return <div role="alert">{error ?? 'No songs are available.'}</div>;

  const song1 = contenders[currentBattleIndex];
  const song2 = contenders[currentBattleIndex + 1];
  if (!song1 || !song2) return <div>Preparing the next battle...</div>;

  const totalMatchupsInRound = contenders.length / 2;
  const currentMatchupNumber = currentBattleIndex / 2 + 1;

  return (
    <section aria-labelledby="round-heading">
      {error && <div className={styles.errorMessage} role="status">{error}</div>}
      {isBattleLoading ? (
        <div className={styles.battleLoading} role="status">Loading next battle...</div>
      ) : (
        <>
          <div className={styles.songBattleContainer}>
            <div className={`${styles.songPanel} ${currentWinnerId === song1.id ? styles.winner : currentLoserId === song1.id ? styles.loser : ''}`}>
              <SpotifyPlayer song={song1} />
              <button type="button" onClick={() => handleVote(song1)} className={`${styles.voteButton} ${lastClickedButtonId === song1.id ? styles.votedButton : ''}`}>Vote</button>
            </div>
            <div className={styles.vsText} aria-hidden="true">VS.</div>
            <div className={`${styles.songPanel} ${currentWinnerId === song2.id ? styles.winner : currentLoserId === song2.id ? styles.loser : ''}`}>
              <SpotifyPlayer song={song2} />
              <button type="button" onClick={() => handleVote(song2)} className={`${styles.voteButton} ${lastClickedButtonId === song2.id ? styles.votedButton : ''}`}>Vote</button>
            </div>
          </div>
          <h2 id="round-heading">Round {round}</h2>
          <ProgressBar current={currentMatchupNumber} total={totalMatchupsInRound} label={`Matchup ${currentMatchupNumber} of ${totalMatchupsInRound}`} />
        </>
      )}
    </section>
  );
};

export default SongBattle;
