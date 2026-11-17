import { useState, useEffect } from "react";
import type { LeaderboardEntry } from "@songbattle/contracts";
import { fetchStatsAPI } from "../services/api";
import styles from "./HallOfFame.module.css";

const HallOfFame = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getStats = async () => {
      setIsLoading(true);
      const stats = await fetchStatsAPI();
      setLeaderboard(stats);
      setIsLoading(false);
    };
    getStats();
  }, []);

  if (isLoading) {
    return <div className={styles.container}>Loading Hall of Fame...</div>;
  }

  if (leaderboard.length === 0) {
    return (
      <div className={styles.container}>
        <h2>Hall of Fame</h2>
        <p>
          No battles have been recorded yet. Play some games to see the winners
          here!
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2>Hall of Fame - Top 10 Winners</h2>
      <ol className={styles.leaderboardList}>
        {leaderboard.map((entry, index) => (
          <li key={entry.songId}>
            <span className={styles.rank}>{index + 1}.</span>
            <div className={styles.songInfo}>
              <span className={styles.title}>{entry.title}</span>
              <span className={styles.artist}>{entry.artists.join(", ")}</span>
            </div>
            <span className={styles.wins}>{entry.wins} Wins</span>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default HallOfFame;
