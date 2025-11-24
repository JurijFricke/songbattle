import React, { useState, useEffect } from 'react';
import { Song } from '../types/Song';
import ProgressBar from './ProgressBar'; // Import ProgressBar component

interface Props {
  songCount: number;
  playlistUrl?: string; // Add playlistUrl to props
  resetGame: () => void; // New prop for resetting the game
}

const SongBattle = ({ songCount, playlistUrl, resetGame }: Props) => {
  const [round, setRound] = useState(1);
  const [contenders, setContenders] = useState<Song[]>([]);
  const [nextContenders, setNextContenders] = useState<Song[]>([]);
  const [winner, setWinner] = useState<Song | null>(null);
  const [currentBattleIndex, setCurrentBattleIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // New state for error messages
  const [isPlaylistLoading, setIsPlaylistLoading] = useState(false); // New state for loading indicator
  const [lastClickedButtonId, setLastClickedButtonId] = useState<string | null>(null); // New state for vote feedback

  useEffect(() => {
    const fetchSongs = async () => {
      setErrorMessage(null); // Clear any previous errors
      setContenders([]); // Clear contenders when fetching new songs
      // Show loading indicator if a playlist URL is provided, regardless of songCount
      if (playlistUrl) {
        setIsPlaylistLoading(true); // Start loading indicator
      }

      try {
        let url = `https://songbattle-backend.onrender.com/api/songs?count=${songCount}`;
        if (playlistUrl) {
          url += `&playlistUrl=${encodeURIComponent(playlistUrl)}`;
        }
        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setContenders(data);
      } catch (error: any) { // Use 'any' type for error for broader compatibility
        console.error('Error fetching songs:', error);
        setErrorMessage(error.message || 'Failed to load songs. Please try again later.');
      } finally {
        if (playlistUrl) { // Always stop loading if a playlist was involved
          setIsPlaylistLoading(false); // End loading indicator
        }
      }
    };
    fetchSongs();
  }, [songCount, playlistUrl]);

  const handleVote = (selectedSong: Song) => {
    setLastClickedButtonId(selectedSong.id); // Set the ID of the clicked song

    // State updates for next battle
    const newNextContenders = [...nextContenders, selectedSong];
    const nextBattleIndex = currentBattleIndex + 2;

    let nextWinner: Song | null = null; // Use a local variable to check winner before setState batch

    if (nextBattleIndex < contenders.length) {
      setCurrentBattleIndex(nextBattleIndex);
    } else {
      if (newNextContenders.length === 1) {
        nextWinner = newNextContenders[0];
        setWinner(nextWinner);
      } else {
        setRound(round + 1);
        setContenders(newNextContenders);
        setNextContenders([]);
        setCurrentBattleIndex(0);
      }
    }

    // Clear feedback for next round after a short delay, but not before content updates
    if (!nextWinner) { // Only clear if game is not over
        setTimeout(() => {
            setLastClickedButtonId(null);
        }, 500); // Duration to show visual feedback
    }
  };

  if (winner) {
    return (
      <div>
        <h2>Winner!</h2>
        <div dangerouslySetInnerHTML={{ __html: winner.embed }} />
        <button
          onClick={resetGame}
          className="start-game-button"
          style={{ marginTop: '30px' }}
        >
          Play Again
        </button>
      </div>
    );
  }

  if (contenders.length === 0) {
    if (isPlaylistLoading) {
      return <ProgressBar current={0} total={1} label="Loading playlist songs..." />;
    }
    return <div>Loading songs...</div>;
  }

  const song1 = contenders[currentBattleIndex];
  const song2 = contenders[currentBattleIndex + 1];

  const totalMatchupsInRound = contenders.length / 2;
  const currentMatchupNumber = (currentBattleIndex / 2) + 1;

  if (!song1 || !song2) {
    // This should ideally not happen if logic is correct, but keep as safeguard
    return <div>Preparing next battle...</div>;
  }

  return (
    <div>
      {errorMessage && (
        <div style={{
          color: 'white',
          backgroundColor: '#e63946', // Red background for error
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          maxWidth: '600px',
          margin: '0 auto 20px auto' // Center and add bottom margin
        }}>
          {errorMessage}
        </div>
      )}
      <h2>Round {round}</h2>
      {totalMatchupsInRound > 0 && (
        <ProgressBar
          current={currentMatchupNumber}
          total={totalMatchupsInRound}
          label={`Matchup ${currentMatchupNumber} of ${totalMatchupsInRound}`}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
        <div style={{ width: '450px' }}>
          <div dangerouslySetInnerHTML={{ __html: song1.embed }} />
          <button
            onClick={() => handleVote(song1)}
            className={`vote-button ${lastClickedButtonId === song1.id ? 'voted-button' : ''}`}
          >
            Vote
          </button>
        </div>
        <div style={{ width: '450px' }}>
          <div dangerouslySetInnerHTML={{ __html: song2.embed }} />
          <button
            onClick={() => handleVote(song2)}
            className={`vote-button ${lastClickedButtonId === song2.id ? 'voted-button' : ''}`}
          >
            Vote
          </button>
        </div>
      </div>
    </div>
  );
};

export default SongBattle;