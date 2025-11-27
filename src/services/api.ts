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

  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};
