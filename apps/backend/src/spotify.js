const SpotifyWebApi = require('spotify-web-api-node');
const { SEARCH_QUERIES, MAX_SONG_DURATION_MS, MIN_TRACK_POPULARITY, NUM_SEARCH_REQUESTS } = require('./config');
const { readSongsFromDB, writeSongsToDB } = require('./database');

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
    const shuffledQueries = [...SEARCH_QUERIES].sort(() => 0.5 - Math.random());
    const randomQueries = shuffledQueries.slice(0, NUM_SEARCH_REQUESTS);
    const searchPromises = randomQueries.map(query => {
        let enhancedQuery = query;
        if (yearFilter) {
            enhancedQuery = `${enhancedQuery} year:${yearFilter}`;
        }
        return spotifyApi.searchTracks(enhancedQuery, { limit: 50 })
            .catch(err => {
                console.warn(`Could not fetch tracks for query "${enhancedQuery}":`, err); // Log entire error object
                return null;
            });
    });
    try {
        const searchResults = await Promise.all(searchPromises);
        return searchResults
            .filter(result => result !== null)
            .flatMap(result => result.body.tracks.items);
    } catch (error) {
        console.error('An unexpected error occurred during parallel song fetching:', error);
        return [];
    }
};

const applyFilters = (tracks) => {
    if (!tracks || tracks.length === 0) return [];
    const audiobookRegex = /hörbuch|audiobook|unabridged|part \d+|chapter \d+/i;
    let filteredTracks = tracks.filter(track =>
        track && track.name && track.album &&
        !audiobookRegex.test(track.name) &&
        !audiobookRegex.test(track.album.name)
    );
    filteredTracks = filteredTracks.filter(track => track.duration_ms < MAX_SONG_DURATION_MS);
    filteredTracks = filteredTracks.filter(track => track.popularity >= MIN_TRACK_POPULARITY);
    return filteredTracks.filter(
        (item, index, self) => item && item.id && self.findIndex(t => t && t.id === item.id) === index
    );
};

const populateSongsPool = async () => {
    let dbLoaded = false;
    try {
        const songsFromDB = await readSongsFromDB();
        if (songsFromDB && songsFromDB.length > 0) {
            songsPool = songsFromDB;
            dbLoaded = true;
            console.log(`Songs loaded from database: ${songsPool.length} songs.`);
        }
    } catch (dbError) {
        console.warn('Could not load songs from database on startup:', dbError);
    }

    await refreshClientAccessToken();

    try {
        const freshTracks = await fetchSongsFromSearch();
        const filteredTracks = applyFilters(freshTracks);

        if (filteredTracks.length > 0) {
            await writeSongsToDB(filteredTracks);
            songsPool = await readSongsFromDB();
            console.log(`Database updated. Total songs in DB: ${songsPool.length}`);
        } else if (!dbLoaded) {
            console.warn('Failed to fetch new songs, and no songs were loaded from DB. Song pool might be empty.');
        } else {
            console.log('Failed to fetch new songs. Using songs from DB.');
        }
    } catch (fetchError) {
        console.error('Error fetching fresh songs:', fetchError);
    }
};

const getSongsForBattle = async (count, playlistUrl, decade) => {
    let tracksToSelect = [];
    let warning = null;

    if (decade) {
        const yearFilter = `${decade.substring(0, 4)}-${parseInt(decade.substring(0, 4)) + 9}`;
        const freshTracks = await fetchSongsFromSearch(yearFilter);
        tracksToSelect = applyFilters(freshTracks);
    } else if (playlistUrl) {
        if (!playlistUrl.includes('/playlist/')) {
            tracksToSelect = songsPool;
            warning = 'The provided URL is not a Spotify playlist URL. Using the general song pool instead.';
        } else {
            const playlistIdMatch = playlistUrl.match(/playlist\/([a-zA-Z0-9]+)/);
            if (playlistIdMatch && playlistIdMatch[1]) {
                const playlistId = playlistIdMatch[1];
                try {
                    // This block is now correct
                    if (!clientAccessToken || spotifyApi.getAccessToken() !== clientAccessToken) {
                        await refreshClientAccessToken();
                    }
                    let allPlaylistItems = [];
                    let offset = 0;
                    let hasMore = true;
                    const hardCapFetchLimit = 1000;
                    const initialPlaylistData = await spotifyApi.getPlaylistTracks(playlistId, { limit: 1, offset: 0 });
                    const totalTracksInPlaylist = initialPlaylistData.body.total;
                    const effectiveFetchLimit = Math.min(totalTracksInPlaylist, hardCapFetchLimit);
                    while (hasMore && allPlaylistItems.length < effectiveFetchLimit) {
                        const limit = Math.min(100, effectiveFetchLimit - allPlaylistItems.length);
                        if (limit <= 0) break;
                        const playlistData = await spotifyApi.getPlaylistTracks(playlistId, { limit: limit, offset: offset });
                        allPlaylistItems = allPlaylistItems.concat(playlistData.body.items);
                        offset += playlistData.body.items.length;
                        hasMore = playlistData.body.next !== null;
                    }
                    let playlistTracks = allPlaylistItems.map(item => item.track).filter(track => track);
                    tracksToSelect = applyFilters(playlistTracks);
                } catch (error) {
                    console.error(`Error fetching songs from playlist ${playlistId}:`, error);
                    tracksToSelect = songsPool;
                    warning = `Could not load the provided playlist. Using the general song pool instead.`;
                }
            } else {
                tracksToSelect = songsPool;
                warning = 'The provided playlist URL was invalid. Using the general song pool instead.';
            }
        }
    } else {
        tracksToSelect = songsPool;
    }

    if (!tracksToSelect || tracksToSelect.length === 0) {
        throw new Error('Song pool is empty.');
    }
    if (tracksToSelect.length < count) {
        throw new Error(`Not enough unique songs available. Requested ${count}, but only ${tracksToSelect.length} loaded.`);
    }

    const shuffled = [...tracksToSelect].sort(() => 0.5 - Math.random());
    const selectedFullTracks = shuffled.slice(0, count);
    
    const selectedSongs = selectedFullTracks.map((item) => ({
        id: item.id,
        title: item.name,
        artist: item.artists.map((artist) => artist.name).join(', '),
        embed: `<iframe src="https://open.spotify.com/embed/track/${item.id}?utm_source=generator&theme=0" width="100%" height="280" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`,
    }));

    return { songs: selectedSongs, warning };
};

module.exports = {
    populateSongsPool,
    getSongsForBattle,
};