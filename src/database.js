const mongoose = require('mongoose');

// A simpler schema that just stores the raw track object from Spotify.
const songSchema = new mongoose.Schema({
    _id: { type: String, index: true },
    track: Object,
}, { _id: false });

const Song = mongoose.model('Song', songSchema);

// Schema for storing battle results
const battleResultSchema = new mongoose.Schema({
    winnerSongId: { type: String, index: true },
    loserSongId: { type: String, index: true },
    timestamp: { type: Date, default: Date.now },
});

const BattleResult = mongoose.model('BattleResult', battleResultSchema);

const connectDB = async () => {
    try {
        if (mongoose.connection.readyState >= 1) {
            return;
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected successfully.');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};
// ... (rest of the file)
module.exports = {
    connectDB,
    readSongsFromDB,
    writeSongsToDB,
    Song, // Export Song model for stats lookup
    BattleResult, // Export BattleResult model
};