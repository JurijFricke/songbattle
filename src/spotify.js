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
    // 1. Create an array of 15 random queries
    const randomQueries = Array.from({ length: 15 }, () =>
        SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)]
    );

    // 2. Map queries to an array of promises
    const searchPromises = randomQueries.map(query => {
        let enhancedQuery = `${query} NOT audiobook NOT "hörbuch"`;
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
            let uniqueTracks = freshTracks.filter(
                (item, index, self) =>
                item && item.id && self.findIndex((t) => t && t.id === item.id) === index
            );

            // Filter out tracks that are too long (likely audiobooks/podcasts)
            uniqueTracks = uniqueTracks.filter(track => track.duration_ms < MAX_SONG_DURATION_MS);

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

const getSongsForBattle = async (count, playlistUrl, decade) => {
    let tracksToSelect = [];

    if (decade) {
        console.log(`Fetching songs for decade: ${decade}`);
        const yearFilter = `${decade.substring(0, 4)}-${parseInt(decade.substring(0, 4)) + 9}`;
        
        let freshTracks = await fetchSongsFromSearch(yearFilter);
        console.log(`Initial fetch for decade found ${freshTracks.length} tracks.`);

        if (freshTracks && freshTracks.length > 0) {
            // Filter out spoken word tracks using audio features
            try {
                const allTrackIds = freshTracks.map(track => track.id);
                const musicTrackIds = new Set();
                
                for (let i = 0; i < allTrackIds.length; i += 100) {
                    const batchIds = allTrackIds.slice(i, i + 100);
                    const audioFeatures = await spotifyApi.getAudioFeaturesForTracks(batchIds);
                    const speechinessThreshold = 0.5;

                    audioFeatures.body.audio_features.forEach(feature => {
                        if (feature && feature.speechiness < speechinessThreshold) {
                            musicTrackIds.add(feature.id);
                        }
                    });
                }
                
                freshTracks = freshTracks.filter(track => musicTrackIds.has(track.id));
                console.log(`After speechiness filter: ${freshTracks.length} tracks remaining.`);
            } catch (audioFeaturesError) {
                console.error('Error fetching audio features for decade battle, skipping speechiness filter:', audioFeaturesError);
            }

            // Filter by uniqueness and duration
            let uniqueTracks = freshTracks.filter(track => track.duration_ms < MAX_SONG_DURATION_MS);
            console.log(`After duration filter: ${uniqueTracks.length} tracks remaining.`);
            
            uniqueTracks = uniqueTracks.filter(
                (item, index, self) => item && item.id && self.findIndex(t => t && t.id === item.id) === index
            );
            console.log(`After uniqueness filter: ${uniqueTracks.length} tracks remaining.`);

            tracksToSelect = uniqueTracks.map((item) => ({
                id: item.id,
                title: item.name,
                artist: item.artists.map((artist) => artist.name).join(', '),
                embed: `<iframe src="https://open.spotify.com/embed/track/${item.id}?utm_source=generator&theme=0" width="100%" height="280" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`,
            }));
        }

    } else if (playlistUrl) {
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

                let playlistTracks = allPlaylistItems.map(item => item.track).filter(track => track); // Get track objects and filter nulls

                // Filter out tracks that are too long
                playlistTracks = playlistTracks.filter(track => track.duration_ms < MAX_SONG_DURATION_MS);
                
                // Filter out spoken word tracks using audio features
                try {
                    const allTrackIds = playlistTracks.map(track => track.id);
                    const musicTrackIds = new Set();
                    
                    for (let i = 0; i < allTrackIds.length; i += 100) {
                        const batchIds = allTrackIds.slice(i, i + 100);
                        const audioFeatures = await spotifyApi.getAudioFeaturesForTracks(batchIds);
                        const speechinessThreshold = 0.5;

                        audioFeatures.body.audio_features.forEach(feature => {
                            if (feature && feature.speechiness < speechinessThreshold) {
                                musicTrackIds.add(feature.id);
                            }
                        });
                    }
                    
                    playlistTracks = playlistTracks.filter(track => musicTrackIds.has(track.id));
                } catch (audioFeaturesError) {
                    console.error('Error fetching audio features for playlist, skipping speechiness filter:', audioFeaturesError);
                }

                const uniquePlaylistTracks = playlistTracks.map(track => ({
                    id: track.id,
                    title: track.name,
                    artist: track.artists.map(artist => artist.name).join(', '),
                    embed: `<iframe src="https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0" width="100%" height="280" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`,
                }));

                tracksToSelect = uniquePlaylistTracks.filter(
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
        // Fallback to the general pool if no decade or playlist is provided
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
