const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
    _id: { type: String, index: true },
    track: Object,
}, { _id: false });

const Song = mongoose.model('Song', songSchema);

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

const readSongsFromDB = async () => {
    try {
        const songs = await Song.find({}).lean();
        return songs.map(s => s.track);
    } catch (error) {
        console.error('Error reading songs from DB:', error);
        return [];
    }
};

const writeSongsToDB = async (tracks) => {
    if (!tracks || tracks.length === 0) {
        return;
    }
    try {
        const operations = tracks.map(track => ({
            updateOne: {
                filter: { _id: track.id },
                update: { $set: { _id: track.id, track: track } },
                upsert: true,
            }
        }));
        const result = await Song.bulkWrite(operations);
        console.log(`Database updated. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}, Inserted: ${result.insertedCount}`);
    } catch (error) {
        console.error('Error writing songs to DB:', error);
    }
};

module.exports = {
    connectDB,
    readSongsFromDB,
    writeSongsToDB,
    Song,
    BattleResult,
};
