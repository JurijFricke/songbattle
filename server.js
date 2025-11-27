require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { REFRESH_INTERVAL } = require('./src/config');
const { connectDB } = require('./src/database');
const { populateSongsPool } = require('./src/spotify');
const apiRoutes = require('./src/routes');

const app = express();
const port = 3001;

// MIDDLEWARE
//===============
// TEMPORARY: Allow all origins for debugging
app.use(cors({ credentials: true, origin: true }));

app.use(express.json());

//===============
// API ROUTES
//===============
app.use('/api', apiRoutes);

//===============
// SERVER STARTUP
//===============
const startServer = async () => {
    await connectDB();
    await populateSongsPool();
    setInterval(populateSongsPool, REFRESH_INTERVAL);

    app.listen(port, () => {
        console.log(`Server listening at http://127.0.0.1:${port}`);
    });
};

startServer();
