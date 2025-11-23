import React from 'react';
import { Song } from '../types/Song';

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
  // Logic to process matchResults and build the bracket structure will go here
  // For now, let's just display the results in a simple list
  // The actual visual bracket representation is complex and will be added later

  if (matchResults.length === 0) {
    return <div className="bracket-container">No matches played yet.</div>;
  }

  // Group match results by rounds (this is a simplified approach, actual rounds might need more complex logic)
  // For now, let's just list all matches. A proper bracket structure will require more thought.

  return (
    <div className="bracket-container">
      <h3>Match Results:</h3>
      {matchResults.map((match, index) => {
        const winnerSong = match.song1.id === match.winnerId ? match.song1 : match.song2;
        const loserSong = match.song1.id === match.winnerId ? match.song2 : match.song1;
        return (
          <div key={index} className="match-result">
            <span className={match.song1.id === match.winnerId ? 'winner' : 'loser'}>
              {match.song1.title} by {match.song1.artist}
            </span>
            {' vs '}
            <span className={match.song2.id === match.winnerId ? 'winner' : 'loser'}>
              {match.song2.title} by {match.song2.artist}
            </span>
            {' -> Winner: '}
            <span className="winner">
              {winnerSong.title} by {winnerSong.artist}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default BracketDisplay;