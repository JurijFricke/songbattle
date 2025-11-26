const SEARCH_QUERIES = [
    // International Genres
    'genre:pop', 'genre:rock', 'genre:indie', 'genre:hip-hop', 'genre:r-n-b',
    'genre:alternative', 'genre:dance', 'genre:metal',
    'genre:latin', 'genre:soul', 'genre:reggae',
    'genre:country', 'genre:folk', 'genre:disco',

    // German Genres
    'genre:german', 'genre:german-hip-hop', 'genre:neue-deutsche-welle',
    'genre:german-indie', 'genre:deutschrock',

    // Generic popular searches
    'top hits'
];

const CACHE_FILE = 'cached_songs.json';
const REFRESH_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours

module.exports = {
    SEARCH_QUERIES,
    CACHE_FILE,
    REFRESH_INTERVAL,
};
