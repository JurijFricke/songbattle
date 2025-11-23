require('dotenv').config();
const express = require('express');
const cors = require('cors');
const SpotifyWebApi = require('spotify-web-api-node');

const app = express();
const port = 3001;

//===============
// MIDDLEWARE
//===============
app.use(cors({ origin: 'http://127.0.0.1:3000', credentials: true }));
app.use(express.json());

//===============
// SPOTIFY API SETUP
//===============
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

let songsPool = []; // This will hold our large pool of unique songs from diverse searches
let clientAccessToken = null; // Store client credentials access token

const SEARCH_QUERIES = [
  'top hits', 'pop', 'rock', 'indie', 'hip hop', 'r&b', 'electronic',
  'alternative', 'dance', 'chill', 'workout', 'happy', 'sad', 'love',
  'motivation', 'focus', 'sleep', 'jazz', 'blues', 'classical', 'metal',
  'country', 'folk', 'reggae', 'latin', 'k-pop', 'j-pop'
];

// Function to get an app-level access token
const refreshClientAccessToken = async () => {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    clientAccessToken = data.body['access_token'];
    spotifyApi.setAccessToken(clientAccessToken);
    console.log('Client credentials access token refreshed.');
  } catch (error) {
    console.error('Error refreshing client credentials access token:', error);
  }
};

// Function to fetch songs using diverse search queries
const fetchSongsFromSearch = async () => {
  let allTracks = [];
  for (let i = 0; i < 5; i++) { // Make 5 search requests
    const randomQuery = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
    try {
      const searchData = await spotifyApi.searchTracks(randomQuery, { limit: 50 });
      allTracks = allTracks.concat(searchData.body.tracks.items);
    } catch (searchError) {
      console.warn(`Could not fetch tracks for query "${randomQuery}":`, searchError.message);
    }
  }
  return allTracks;
};

// Populate the main song pool on startup and refresh periodically
const populateSongsPool = async () => {
  await refreshClientAccessToken();
  const tracks = await fetchSongsFromSearch();

  const uniqueTracks = tracks.filter(
    (item, index, self) =>
      item && item.id && self.findIndex((t) => t && t.id === item.id) === index
  );

  songsPool = uniqueTracks.map((item) => ({
    id: item.id,
    title: item.name,
    artist: item.artists.map((artist) => artist.name).join(', '),
          embed: `<iframe src="https://open.spotify.com/embed/track/${item.id}" width="100%" height="352" frameBorder="0"></iframe>`,  }));
  console.log(`Successfully fetched and mapped ${songsPool.length} unique songs into the pool.`);
};

// Initial population and periodic refresh
populateSongsPool();
setInterval(populateSongsPool, 2 * 60 * 60 * 1000); // Refresh every 2 hours


//===============
// API ROUTES
//===============
app.get('/api/songs', async (req, res) => {
  const count = parseInt(req.query.count) || 16;
  const playlistUrl = req.query.playlistUrl;
  console.log('Received /api/songs request. Count:', count, 'Playlist URL:', playlistUrl);

  let tracksToSelect = [];

  if (playlistUrl) {
    const playlistIdMatch = playlistUrl.match(/playlist\/([a-zA-Z0-9]+)/);
    console.log('Playlist ID match result:', playlistIdMatch);
    if (playlistIdMatch && playlistIdMatch[1]) {
      const playlistId = playlistIdMatch[1];
      try {
        // Ensure client access token is valid
        if (!clientAccessToken || spotifyApi.getAccessToken() !== clientAccessToken) {
            await refreshClientAccessToken();
        }
        const playlistData = await spotifyApi.getPlaylistTracks(playlistId, { limit: 100 }); // Fetch up to 100 tracks
        
        const playlistTracks = playlistData.body.items
            .filter(item => item && item.track) // Filter out null tracks
            .map(item => ({
                id: item.track.id,
                title: item.track.name,
                artist: item.track.artists.map(artist => artist.name).join(', '),
                embed: `<iframe src="https://open.spotify.com/embed/track/${item.track.id}?utm_source=generator&theme=0" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`,
            }));
        
        // Remove duplicates within the playlist
        const uniquePlaylistTracks = playlistTracks.filter(
            (item, index, self) => item && item.id && self.findIndex(t => t && t.id === item.id) === index
        );

        tracksToSelect = uniquePlaylistTracks;
        console.log(`Fetched ${tracksToSelect.length} songs from provided playlist.`);

      } catch (error) {
        console.error(`Error fetching songs from playlist ${playlistId}:`, error);
        // Fallback to general pool if playlist fetch fails
        tracksToSelect = songsPool;
        console.log('Falling back to general song pool due to playlist fetch error.');
      }
    } else {
      console.warn('Invalid playlist URL provided. Falling back to general song pool.');
      tracksToSelect = songsPool;
    }
  } else {
    // If no playlist URL, use the general pool
    tracksToSelect = songsPool;
  }

  if (tracksToSelect.length === 0) {
    return res.status(503).json({ error: 'Song pool is empty. Please try again in a moment.' });
  }
  if (tracksToSelect.length < count) {
    return res.status(503).json({ error: `Not enough unique songs available in the pool. Requested ${count}, but only ${tracksToSelect.length} loaded.` });
  }

  console.log('Final tracksToSelect length:', tracksToSelect.length);

  const shuffled = [...tracksToSelect].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);
  res.json(selected);
});

app.listen(port, () => {
  console.log(`Server listening at http://127.0.0.1:${port}`);
});