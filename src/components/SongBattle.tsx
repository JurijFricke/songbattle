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
  const [isBattleLoading, setIsBattleLoading] = useState(false); // New state for battle transition loading

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
    setIsBattleLoading(true); // Start battle loading indicator

    // After a short delay to allow for visual feedback/DOM updates
    setTimeout(() => {
      setLastClickedButtonId(null); // Clear feedback before next battle starts

      const newNextContenders = [...nextContenders, selectedSong];
      const nextBattleIndexCandidate = currentBattleIndex + 2;

      let updatedContenders = contenders;
      let updatedRound = round;
      let updatedNextContenders: Song[] = [];
      let updatedCurrentBattleIndex = 0;
      let nextGameWinner: Song | null = null;

      if (nextBattleIndexCandidate < contenders.length) {
        // Still in the current round
        updatedCurrentBattleIndex = nextBattleIndexCandidate;
        updatedNextContenders = newNextContenders;
      } else {
        // End of a round or game
        if (newNextContenders.length === 1) {
          // Game over, winner found
          nextGameWinner = newNextContenders[0];
        } else {
          // Advance to next round
          updatedRound = round + 1;
          updatedContenders = newNextContenders; // Winners of this round become contenders for the next
          updatedCurrentBattleIndex = 0;
          // updatedNextContenders remains []
        }
      }

      // Update all states together after calculating the next state
      setContenders(updatedContenders);
      setRound(updatedRound);
      setNextContenders(updatedNextContenders);
      setCurrentBattleIndex(updatedCurrentBattleIndex);
      setWinner(nextGameWinner); // This will be null unless a winner is found

      // End battle loading indicator after all state updates are batched and processed
      setTimeout(() => {
        setIsBattleLoading(false);
      }, 50); // Small delay to ensure React has rendered new content
    }, 300); // Duration to show visual feedback / brief "loading" state
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

      {isBattleLoading ? (
        <div style={{ marginTop: '50px', fontSize: '1.5rem', color: '#555' }}>Loading next battle...</div>
      ) : (
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
      )}
      <h2>Round {round}</h2>
      {totalMatchupsInRound > 0 && (
        <ProgressBar
          current={currentMatchupNumber}
          total={totalMatchupsInRound}
          label={`Matchup ${currentMatchupNumber} of ${totalMatchupsInRound}`}
        />
      )}
    </div>
  );
};

export default SongBattle;