const SpotifyWebApi = require('spotify-web-api-node');
const { SEARCH_QUERIES } = require('./config');
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

const fetchSongsFromSearch = async () => {
    let allTracks = [];
    for (let i = 0; i < 15; i++) {
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

const populateSongsPool = async () => {
    let cacheLoaded = false;
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

    await refreshClientAccessToken();

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
            songsPool = newSongsPool;
            await writeCache(songsPool);
            console.log(`Successfully fetched and mapped ${songsPool.length} unique songs into the pool and updated cache.`);
        } else if (!cacheLoaded) {
            console.warn('Failed to fetch new songs, and no cache was loaded. Song pool might be empty.');
        } else {
            console.log('Failed to fetch new songs. Using previously loaded cache.');
        }
    } catch (fetchError) {
        console.error('Error fetching fresh songs:', fetchError);
        if (!cacheLoaded) {
            console.warn('Failed to fetch new songs, and no cache was loaded. Song pool might be empty.');
        }
    }
};

const getSongsForBattle = async (count, playlistUrl) => {
    let tracksToSelect = [];

    if (playlistUrl) {
        const playlistIdMatch = playlistUrl.match(/playlist\/([a-zA-Z0-9]+)/);
        if (playlistIdMatch && playlistIdMatch[1]) {
            const playlistId = playlistIdMatch[1];
            try {
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

                const playlistTracks = allPlaylistItems
                    .filter(item => item && item.track)
                    .map(item => ({
                        id: item.track.id,
                        title: item.track.name,
                        artist: item.track.artists.map(artist => artist.name).join(', '),
                        embed: `<iframe src="https://open.spotify.com/embed/track/${item.track.id}?utm_source=generator&theme=0" width="100%" height="280" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`,
                    }));

                tracksToSelect = playlistTracks.filter(
                    (item, index, self) => item && item.id && self.findIndex(t => t && t.id === item.id) === index
                );
                console.log(`Fetched ${tracksToSelect.length} songs from provided playlist.`);
            } catch (error) {
                console.error(`Error fetching songs from playlist ${playlistId}:`, error);
                tracksToSelect = songsPool;
                console.log('Falling back to general song pool due to playlist fetch error.');
            }
        } else {
            console.warn('Invalid playlist URL provided. Falling back to general song pool.');
            tracksToSelect = songsPool;
        }
    } else {
        tracksToSelect = songsPool;
    }

    if (tracksToSelect.length === 0) {
        throw new Error('Song pool is empty.');
    }
    if (tracksToSelect.length < count) {
        throw new Error(`Not enough unique songs available. Requested ${count}, but only ${tracksToSelect.length} loaded.`);
    }

    const shuffled = [...tracksToSelect].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};


module.exports = {
    populateSongsPool,
    getSongsForBattle,
};
