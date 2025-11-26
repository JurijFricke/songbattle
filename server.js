require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { REFRESH_INTERVAL } = require('./src/config');
const { populateSongsPool } = require('./src/spotify');
const apiRoutes = require('./src/routes');

const app = express();
const port = 3001;

//===============
// MIDDLEWARE
//===============
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://127.0.0.1:3000'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json());

//===============
// API ROUTES
//===============
app.use('/api', apiRoutes);

//===============
// SERVER STARTUP
//===============
const startServer = async () => {
    await populateSongsPool();
    setInterval(populateSongsPool, REFRESH_INTERVAL);

    app.listen(port, () => {
        console.log(`Server listening at http://127.0.0.1:${port}`);
    });
};

startServer();