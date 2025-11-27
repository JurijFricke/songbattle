require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { REFRESH_INTERVAL } = require('./src/config');
const { connectDB } = require('./src/database');
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
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow from the configured origins
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }

        // Always allow any Netlify preview URL (for single service deployment strategy)
        if (new RegExp("https://.*--songbattle-frontend.netlify.app").test(origin)) {
            return callback(null, true);
        }

        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
    },
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
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
    await connectDB();
    await populateSongsPool();
    setInterval(populateSongsPool, REFRESH_INTERVAL);

    app.listen(port, () => {
        console.log(`Server listening at http://127.0.0.1:${port}`);
    });
};

startServer();
