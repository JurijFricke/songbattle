const express = require('express');
const cors = require('cors');
const { getSongsForBattle } = require('./spotify');
const { BattleResult, Song } = require('./database');
const router = express.Router();

const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://127.0.0.1:3000'];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        if (new RegExp("https://.*--songbattle-frontend.netlify.app").test(origin)) {
            return callback(null, true);
        }
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
    },
    credentials: true,
    optionsSuccessStatus: 204
};

router.options('*', cors(corsOptions));

router.get('/songs', cors(corsOptions), async (req, res) => {
    const count = parseInt(req.query.count) || 16;
    const playlistUrl = req.query.playlistUrl;
    const decade = req.query.decade;
    console.log('Received /api/songs request. Count:', count, 'Playlist URL:', playlistUrl, 'Decade:', decade);

    try {
        const { songs, warning } = await getSongsForBattle(count, playlistUrl, decade);
        if (warning) {
            res.json({ songs, warning });
        } else {
            res.json({ songs });
        }
    } catch (error) {
        console.error('Error in /api/songs route:', error.message);
        res.status(503).json({ error: error.message || 'Failed to get songs.' });
    }
});

router.post('/result', cors(corsOptions), async (req, res) => {
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

router.get('/stats', cors(corsOptions), async (req, res) => {
    try {
        const topWinners = await BattleResult.aggregate([
            { $group: { _id: '$winnerSongId', wins: { $sum: 1 } } },
            { $sort: { wins: -1 } },
            { $limit: 10 }
        ]);

        if (topWinners.length === 0) return res.json([]);

        const topWinnerIds = topWinners.map(winner => winner._id);
        const songDetails = await Song.find({ _id: { $in: topWinnerIds } }).lean();
        
        const songDetailsMap = songDetails.reduce((map, song) => {
            map[song._id] = song.track;
            return map;
        }, {});

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