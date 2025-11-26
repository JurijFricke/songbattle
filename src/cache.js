const fs = require('fs').promises;
const { CACHE_FILE } = require('./config');

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

module.exports = {
    readCache,
    writeCache,
};
