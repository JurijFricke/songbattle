require('dotenv').config();
const express = require('express');
const cors = require('cors');
const SpotifyWebApi = require('spotify-web-api-node');
const fs = require('fs').promises; // Import fs.promises for async file operations

const app = express();
const port = 3001;

const CACHE_FILE = 'cached_songs.json';

// Helper function to read from cache
const readCache = async () => {
    try {
        const data = await fs.readFile(CACHE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code !== 'ENOENT') { // Ignore file not found errors
            console.error('Error reading cache file:', error);
        }
        return [];
    }
};

// Helper function to write to cache
const writeCache = async (data) => {
    try {
        await fs.writeFile(CACHE_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing cache file:', error);
    }
};

//===============
// MIDDLEWARE
//===============
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://127.0.0.1:3000'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));
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
    'motivation', 'focus', 'sleep', 'metal',
    'latin',

    // German Music - Older Hits / Neue Deutsche Welle
    'deutscher pop 80er', 'neue deutsche welle',

    // German Music - Hip-Hop
    'deutscher hip hop', 'deutschrap', 'underground deutschrap',

    // German Music - Radio Pop
    'deutscher radio pop', 'aktuelle deutsche hits',

    // General German genres with diversity in mind
    'german indie', 'german alternative', 'deutscher soul', 'german rock', 'deutscher pop', 'deutsche lieder'
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
    for (let i = 0; i < 15; i++) { // Make 15 search requests
        const randomQuery = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
        try {
            const searchData = await spotifyApi.searchTracks(randomQuery, { limit: 50 }); // Fetch up to 50 tracks per request
            allTracks = allTracks.concat(searchData.body.tracks.items);
        } catch (searchError) {
            console.warn(`Could not fetch tracks for query "${randomQuery}":`, searchError.message);
        }
    }
    return allTracks;
};

// Populate the main song pool on startup and refresh periodically

const populateSongsPool = async () => {

    let cacheLoaded = false;



    // Try to load from cache first

    try {

        const cachedData = await readCache();

        if (cachedData && cachedData.length > 0) {

            songsPool = cachedData;

            cacheLoaded = true;

            console.log(`Songs loaded from cache: ${songsPool.length} songs.`);

        }

    } catch (cacheError) {

        console.warn('Could not load songs from cache on startup:', cacheError.message);

    }



    await refreshClientAccessToken(); // Always try to refresh token



    try {

        const freshTracks = await fetchSongsFromSearch();

        if (freshTracks && freshTracks.length > 0) {

            const uniqueTracks = freshTracks.filter(

                (item, index, self) =>

                item && item.id && self.findIndex((t) => t && t.id === item.id) === index

            );



            const newSongsPool = uniqueTracks.map((item) => ({

                id: item.id,

                title: item.name,

                artist: item.artists.map((artist) => artist.name).join(', '),

                embed: `<iframe src="https://open.spotify.com/embed/track/${item.id}?utm_source=generator&theme=0" width="100%" height="280" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`,

            }));

            songsPool = newSongsPool; // Update the global songsPool

            await writeCache(songsPool); // Write successful fetch to cache

            console.log(`Successfully fetched and mapped ${songsPool.length} unique songs into the pool and updated cache.`);

        } else if (!cacheLoaded) {

            // If fetch failed and no cache was loaded, log a warning

            console.warn('Failed to fetch new songs, and no cache was loaded. Song pool might be empty.');

        } else {

            console.log('Failed to fetch new songs. Using previously loaded cache.');

        }

    } catch (fetchError) {

        console.error('Error fetching fresh songs:', fetchError);

        if (cacheLoaded) {

            console.warn('Failed to fetch new songs. Using previously loaded cache.');

        } else {

            console.warn('Failed to fetch new songs, and no cache was loaded. Song pool might be empty.');

        }

    }

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
                let allPlaylistItems = [];
                let offset = 0;
                let hasMore = true;
                const hardCapFetchLimit = 1000; // Hard cap on total tracks to fetch from a playlist

                // Make an initial call to get total, then determine effective fetch limit
                const initialPlaylistData = await spotifyApi.getPlaylistTracks(playlistId, { limit: 1, offset: 0 }); // Fetch just 1 to get total
                const totalTracksInPlaylist = initialPlaylistData.body.total;
                const effectiveFetchLimit = Math.min(totalTracksInPlaylist, hardCapFetchLimit);

                while (hasMore && allPlaylistItems.length < effectiveFetchLimit) {
                    const limit = Math.min(100, effectiveFetchLimit - allPlaylistItems.length); // Don't request more than needed
                    if (limit <= 0) break; // Stop if no more tracks needed

                    const playlistData = await spotifyApi.getPlaylistTracks(playlistId, { limit: limit, offset: offset });
                    allPlaylistItems = allPlaylistItems.concat(playlistData.body.items);
                    offset += playlistData.body.items.length;
                    hasMore = playlistData.body.next !== null;
                }

                const playlistTracks = allPlaylistItems
                    .filter(item => item && item.track) // Filter out null tracks
                    .map(item => ({
                        id: item.track.id,
                        title: item.track.name,
                        artist: item.track.artists.map(artist => artist.name).join(', '),
                        embed: `<iframe src="https://open.spotify.com/embed/track/${item.track.id}?utm_source=generator&theme=0" width="100%" height="280" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`,
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
