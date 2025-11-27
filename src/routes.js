const express = require('express');
const { getSongsForBattle } = require('./spotify');
const router = express.Router();

router.get('/songs', async (req, res) => {
    const count = parseInt(req.query.count) || 16;
    const playlistUrl = req.query.playlistUrl;
    const decade = req.query.decade; // Read the decade from query params
    console.log('Received /api/songs request. Count:', count, 'Playlist URL:', playlistUrl, 'Decade:', decade);

    try {
        const selectedSongs = await getSongsForBattle(count, playlistUrl, decade);
        res.json(selectedSongs);
    } catch (error) {
        console.error('Error in /api/songs route:', error.message);
        // Determine status code based on error message
        if (error.message.includes('Not enough unique songs')) {
            res.status(503).json({ error: error.message });
        } else {
            res.status(503).json({ error: 'Song pool is empty or could not be loaded. Please try again in a moment.' });
        }
    }
});

module.exports = router;
