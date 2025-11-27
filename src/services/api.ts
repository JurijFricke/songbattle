import { Song } from '../types/Song';

interface ApiResponse {
  songs: Song[];
  warning?: string;
}

export const fetchSongsAPI = async (count: number, playlistUrl?: string, decade?: string): Promise<ApiResponse> => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://songbattle-backend.onrender.com';
  let url = `${backendUrl}/api/songs?count=${count}`;

  if (playlistUrl) {
    url += `&playlistUrl=${encodeURIComponent(playlistUrl)}`;
  } else if (decade) {
    url += `&decade=${decade}`;
  }

  console.log('Fetching from URL:', url); // Add this for debugging
  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

export const saveBattleResultAPI = async (winnerSongId: string, loserSongId: string): Promise<void> => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://songbattle-backend.onrender.com';
  try {
    await fetch(`${backendUrl}/api/result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ winnerSongId, loserSongId }),
    });
  } catch (error) {
    console.error("Failed to save battle result:", error);
    // Don't block the user for this, just log the error
  }
};

export interface LeaderboardEntry {
  songId: string;
  wins: number;
  title: string;
  artist: string;
}

export const fetchStatsAPI = async (): Promise<LeaderboardEntry[]> => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://songbattle-backend.onrender.com';
  try {
    const response = await fetch(`${backendUrl}/api/stats`);
    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return []; // Return empty array on error
  }
};
