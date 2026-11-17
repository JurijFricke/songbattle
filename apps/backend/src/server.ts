import 'dotenv/config';
import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { db, sqliteClient } from './database/client.js';
import { config } from './config.js';
import { formatError, apiRouter } from './routes.js';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()) ?? true }));
app.use(express.json({ limit: '32kb' }));
app.use(rateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: config.rateLimitMaxRequests,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
}));
app.use('/api', apiRouter);

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const formatted = formatError(error);
  response.status(formatted.status).json(formatted.body);
};
app.use(errorHandler);

await migrate(db, { migrationsFolder: './drizzle' });

const server = app.listen(config.port, () => {
  console.log(`SongBattle API listening on port ${config.port}.`);
});

const shutdown = (): void => {
  server.close(() => {
    sqliteClient.close();
    process.exit(0);
  });
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
