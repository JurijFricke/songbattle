const express = require('express');
const { getSongsForBattle } = require('./spotify');
const { BattleResult, Song } = require('./database'); // Import models
const router = express.Router();

router.get('/songs', async (req, res) => {
    // ... (existing /songs logic)
});

// Endpoint to save the result of a battle
router.post('/result', async (req, res) => {
    try {
        const { winnerSongId, loserSongId } = req.body;
        if (!winnerSongId || !loserSongId) {
            return res.status(400).json({ error: 'Missing winner or loser song ID.' });
        }
        const result = new BattleResult({ winnerSongId, loserSongId });
        await result.save();
        res.status(201).json({ message: 'Result saved.' });
    } catch (error) {
        console.error('Error saving battle result:', error);
        res.status(500).json({ error: 'Failed to save battle result.' });
    }
});

// Endpoint to get the top 10 winners
router.get('/stats', async (req, res) => {
    try {
        // 1. Aggregate results to get top 10 winner IDs and their win counts
        const topWinners = await BattleResult.aggregate([
            { $group: { _id: '$winnerSongId', wins: { $sum: 1 } } },
            { $sort: { wins: -1 } },
            { $limit: 10 }
        ]);

        if (topWinners.length === 0) {
            return res.json([]);
        }

        // 2. Get the song IDs from the aggregation result
        const topWinnerIds = topWinners.map(winner => winner._id);

        // 3. Find the song details for these IDs from the 'songs' collection
        const songDetails = await Song.find({ _id: { $in: topWinnerIds } }).lean();
        
        // 4. Map song details into a lookup object for easy access
        const songDetailsMap = songDetails.reduce((map, song) => {
            map[song._id] = song.track; // Assuming song.track holds the raw track object
            return map;
        }, {});

        // 5. Combine the win counts with the song details
        const leaderboard = topWinners.map(winner => {
            const details = songDetailsMap[winner._id];
            return {
                songId: winner._id,
                wins: winner.wins,
                title: details ? details.name : 'Unknown',
                artist: details ? details.artists.map(a => a.name).join(', ') : 'Unknown',
            };
        });

        res.json(leaderboard);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
});

module.exports = router;
