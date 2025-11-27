const SpotifyWebApi = require('spotify-web-api-node');
const { SEARCH_QUERIES, MAX_SONG_DURATION_MS } = require('./config');
const { readCache, writeCache } = require('./cache');

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

let songsPool = [];
let clientAccessToken = null;

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

const fetchSongsFromSearch = async (yearFilter) => {
    // 1. Shuffle search queries and pick the first 15 to ensure variety
    const shuffledQueries = [...SEARCH_QUERIES].sort(() => 0.5 - Math.random());
    const randomQueries = shuffledQueries.slice(0, 15);

    // 2. Map queries to an array of promises
    const searchPromises = randomQueries.map(query => {
        let enhancedQuery = query;
        if (yearFilter) {
            enhancedQuery = `${enhancedQuery} year:${yearFilter}`;
        }
        return spotifyApi.searchTracks(enhancedQuery, { limit: 50 })
            .catch(err => {
                console.warn(`Could not fetch tracks for query "${enhancedQuery}":`, err.message);
                return null; // Return null on error to not break Promise.all
            });
    });

    try {
        // 3. Execute all promises in parallel
        const searchResults = await Promise.all(searchPromises);

        // 4. Process the results
        const allTracks = searchResults
            .filter(result => result !== null) // Filter out failed requests
            .flatMap(result => result.body.tracks.items); // Use flatMap to get all tracks in a single array

        return allTracks;
    } catch (error) {
        console.error('An unexpected error occurred during parallel song fetching:', error);
        return []; // Return an empty array in case of an unexpected failure
    }
};

const populateSongsPool = async () => {
    // ... (cache loading logic) ...

    try {
        let freshTracks = await fetchSongsFromSearch();
        console.log(`Initial fetch for general pool found ${freshTracks.length} tracks.`);

        if (freshTracks && freshTracks.length > 0) {
            // Filter out audiobooks by title and album name
            const audiobookRegex = /hörbuch|audiobook|unabridged|part \d+|chapter \d+/i;
            freshTracks = freshTracks.filter(track => 
                !audiobookRegex.test(track.name) && 
                !audiobookRegex.test(track.album.name)
            );

            // Filter by duration and uniqueness
            let uniqueTracks = freshTracks.filter(track => track.duration_ms < MAX_SONG_DURATION_MS);
            uniqueTracks = uniqueTracks.filter(
                (item, index, self) => item && item.id && self.findIndex(t => t && t.id === item.id) === index
            );

            const newSongsPool = uniqueTracks.map((item) => ({
                // ...
            }));
            // ...
        }
    // ...
};

const getSongsForBattle = async (count, playlistUrl, decade) => {
    // ...
    if (decade) {
        console.log(`Fetching songs for decade: ${decade}`);
        const yearFilter = `${decade.substring(0, 4)}-${parseInt(decade.substring(0, 4)) + 9}`;
        
        let freshTracks = await fetchSongsFromSearch(yearFilter);
        console.log(`Initial fetch for decade found ${freshTracks.length} tracks.`);

        if (freshTracks && freshTracks.length > 0) {
            // Filter out audiobooks by title and album name
            const audiobookRegex = /hörbuch|audiobook|unabridged|part \d+|chapter \d+/i;
            freshTracks = freshTracks.filter(track => 
                !audiobookRegex.test(track.name) && 
                !audiobookRegex.test(track.album.name)
            );

            // Filter by duration and uniqueness
            let uniqueTracks = freshTracks.filter(track => track.duration_ms < MAX_SONG_DURATION_MS);
            uniqueTracks = uniqueTracks.filter(
                (item, index, self) => item && item.id && self.findIndex(t => t && t.id === item.id) === index
            );

            tracksToSelect = uniqueTracks.map((item) => ({
                // ...
            }));
        }

    } else if (playlistUrl) {
        // ... (playlist logic)
        
        // Apply audiobook filter to playlists as well
        const audiobookRegex = /hörbuch|audiobook|unabridged|part \d+|chapter \d+/i;
        playlistTracks = playlistTracks.filter(track => 
            !audiobookRegex.test(track.name) && 
            track.album && !audiobookRegex.test(track.album.name)
        );
        
        // ...
    }
    // ...
};


module.exports = {
    populateSongsPool,
    getSongsForBattle,
};
