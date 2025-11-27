import React, { useState, useEffect } from 'react';
import { Song } from '../types/Song';
import ProgressBar from './ProgressBar'; // Import ProgressBar component
import { fetchSongsAPI } from '../services/api';

interface Props {
  songCount: number;
  playlistUrl?: string;
  decade?: string;
  resetGame: () => void;
}

const SongBattle = ({ songCount, playlistUrl, decade, resetGame }: Props) => {
  const [round, setRound] = useState(1);
  const [contenders, setContenders] = useState<Song[]>([]);
  const [nextContenders, setNextContenders] = useState<Song[]>([]);
  const [winner, setWinner] = useState<Song | null>(null);
  const [currentBattleIndex, setCurrentBattleIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPlaylistLoading, setIsPlaylistLoading] = useState(false);
  const [lastClickedButtonId, setLastClickedButtonId] = useState<string | null>(null);
  const [isBattleLoading, setIsBattleLoading] = useState(false);

  useEffect(() => {
    const loadSongs = async () => {
      setErrorMessage(null);
      setContenders([]);
      if (playlistUrl || decade) {
        setIsPlaylistLoading(true);
      }

      try {
        const { songs, warning } = await fetchSongsAPI(songCount, playlistUrl, decade);
        if (warning) {
          alert(warning);
        }
        setContenders(songs);
      } catch (error: any) {
        console.error('Error fetching songs:', error);
        setErrorMessage(error.message || 'Failed to load songs. Please try again later.');
      } finally {
        if (playlistUrl || decade) {
          setIsPlaylistLoading(false);
        }
      }
    };
    loadSongs();
  }, [songCount, playlistUrl, decade]);

  // ... (rest of the component)

  const handleVote = (selectedSong: Song) => {
    setLastClickedButtonId(selectedSong.id);
    setIsBattleLoading(true);

    setTimeout(() => {
      setLastClickedButtonId(null);

      const newNextContenders = [...nextContenders, selectedSong];
      const nextBattleIndexCandidate = currentBattleIndex + 2;

      let updatedContenders = contenders;
      let updatedRound = round;
      let updatedNextContenders: Song[] = [];
      let updatedCurrentBattleIndex = 0;
      let nextGameWinner: Song | null = null;

      if (nextBattleIndexCandidate < contenders.length) {
        updatedCurrentBattleIndex = nextBattleIndexCandidate;
        updatedNextContenders = newNextContenders;
      } else {
        if (newNextContenders.length === 1) {
          nextGameWinner = newNextContenders[0];
        } else {
          updatedRound = round + 1;
          updatedContenders = newNextContenders;
          updatedCurrentBattleIndex = 0;
        }
      }

      setContenders(updatedContenders);
      setRound(updatedRound);
      setNextContenders(updatedNextContenders);
      setCurrentBattleIndex(updatedCurrentBattleIndex);
      setWinner(nextGameWinner);

      setTimeout(() => {
        setIsBattleLoading(false);
      }, 50);
    }, 300);
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
    return <div>Preparing next battle...</div>;
  }

  return (
    <div>
      {errorMessage && (
        <div style={{
          color: 'white',
          backgroundColor: '#e63946',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          maxWidth: '600px',
          margin: '0 auto 20px auto'
        }}>
          {errorMessage}
        </div>
      )}

      {isBattleLoading ? (
        <div style={{ marginTop: '50px', fontSize: '1.5rem', color: '#555' }}>Loading next battle...</div>
      ) : (
        <>
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
            <div className="vs-text">VS.</div>
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
          <h2>Round {round}</h2>
          {totalMatchupsInRound > 0 && (
            <ProgressBar
              current={currentMatchupNumber}
              total={totalMatchupsInRound}
              label={`Matchup ${currentMatchupNumber} of ${totalMatchupsInRound}`}
            />
          )}
        </>
      )}
    </div>
  );
};

export default SongBattle;
