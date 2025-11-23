import React, { useState, useEffect } from 'react';
import { Song } from '../types/Song';

interface Props {
  songCount: number;
  playlistUrl?: string; // Add playlistUrl to props
}

const SongBattle = ({ songCount, playlistUrl }: Props) => {
  const [round, setRound] = useState(1);
  const [contenders, setContenders] = useState<Song[]>([]);
  const [nextContenders, setNextContenders] = useState<Song[]>([]);
  const [winner, setWinner] = useState<Song | null>(null);
  const [currentBattleIndex, setCurrentBattleIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // New state for error messages
  const [initialContenders, setInitialContenders] = useState<Song[]>([]); // State to store initial song list

  useEffect(() => {
    const fetchSongs = async () => {
      setErrorMessage(null); // Clear any previous errors
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
        setInitialContenders(data); // Store initial fetched songs
      } catch (error: any) { // Use 'any' type for error for broader compatibility
        console.error('Error fetching songs:', error);
        setErrorMessage(error.message || 'Failed to load songs. Please try again later.');
      }
    };
    fetchSongs();
  }, [songCount, playlistUrl]);

  const handleVote = (selectedSong: Song) => {
    const newNextContenders = [...nextContenders, selectedSong];
    setNextContenders(newNextContenders);

    const nextBattleIndex = currentBattleIndex + 2;

    if (nextBattleIndex < contenders.length) {
      setCurrentBattleIndex(nextBattleIndex);
    } else {
      if (newNextContenders.length === 1) {
        setWinner(newNextContenders[0]);
      } else {
        setRound(round + 1);
        setContenders(newNextContenders);
        setNextContenders([]);
        setCurrentBattleIndex(0);
      }
    }
  };

  if (winner) {
    return (
      <div>
        <h2>Winner!</h2>
        <div dangerouslySetInnerHTML={{ __html: winner.embed }} />
      </div>
    );
  }

  if (contenders.length === 0) {
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
        <h3>Matchup {currentMatchupNumber}/{totalMatchupsInRound}</h3>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
        <div style={{ width: '450px' }}>
          <div dangerouslySetInnerHTML={{ __html: song1.embed }} />
          <button
            onClick={() => handleVote(song1)}
            className="vote-button"
          >
            Vote
          </button>
        </div>
        <div style={{ width: '450px' }}>
          <div dangerouslySetInnerHTML={{ __html: song2.embed }} />
          <button
            onClick={() => handleVote(song2)}
            className="vote-button"
          >
            Vote
          </button>
        </div>
      </div>
    </div>
  );
};

export default SongBattle;