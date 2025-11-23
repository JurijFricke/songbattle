import React from 'react';
import { Song } from '../types/Song';
import './BracketDisplay.css'; // Import BracketDisplay styles

interface MatchResult {
  song1: Song;
  song2: Song;
  winnerId: string;
}

interface BracketDisplayProps {
  initialSongs: Song[];
  matchResults: MatchResult[];
}

const BracketDisplay: React.FC<BracketDisplayProps> = ({ initialSongs, matchResults }) => {
  if (matchResults.length === 0) {
    return <div className="bracket-container">No matches played yet.</div>;
  }

  // Determine the number of rounds
  const totalSongs = initialSongs.length;
  let numRounds = 0;
  if (totalSongs > 1) {
    numRounds = Math.log2(totalSongs);
  }

  const rounds: MatchResult[][] = [];
  let matchIndex = 0;

  for (let r = 0; r < numRounds; r++) {
    const matchesInRound = totalSongs / Math.pow(2, r + 1);
    const currentRoundMatches: MatchResult[] = [];
    for (let i = 0; i < matchesInRound; i++) {
      if (matchIndex < matchResults.length) {
        currentRoundMatches.push(matchResults[matchIndex]);
        matchIndex++;
      }
    }
    if (currentRoundMatches.length > 0) {
      rounds.push(currentRoundMatches);
    }
  }

  return (
    <div className="bracket-container">
      <h3>Tournament Bracket</h3>
      <div className="bracket-rounds">
        {rounds.map((roundMatches, roundIndex) => (
          <div key={roundIndex} className="bracket-round">
            <h4>Round {roundIndex + 1}</h4>
            {roundMatches.map((match, matchIdx) => {
              const winnerSong = match.song1.id === match.winnerId ? match.song1 : match.song2;
              return (
                <div key={matchIdx} className="match">
                  <div className="match-pair">
                    <div className={match.song1.id === match.winnerId ? 'song-entry winner' : 'song-entry loser'}>
                      {match.song1.title}
                    </div>
                    <div className={match.song2.id === match.winnerId ? 'song-entry winner' : 'song-entry loser'}>
                      {match.song2.title}
                    </div>
                  </div>
                  <div className="match-winner-indicator">
                    <span className="winner-label">Winner:</span> {winnerSong.title}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BracketDisplay;