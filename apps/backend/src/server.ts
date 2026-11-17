import "dotenv/config";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db, initializeDatabase, sqliteClient } from "./database/client.js";
import { config } from "./config.js";
import { formatError, apiRouter } from "./routes.js";
import { SpotifyApiError } from "./spotify/client.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin:
      process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()) ??
      true,
  }),
);
app.use(express.json({ limit: "32kb" }));
app.use(
  rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.rateLimitMaxRequests,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
app.use("/api", apiRouter);

const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  if (
    error instanceof SpotifyApiError &&
    error.retryAfterSeconds !== undefined
  ) {
    response.setHeader("Retry-After", String(error.retryAfterSeconds));
  }
  const formatted = formatError(error);
  response.status(formatted.status).json(formatted.body);
};
app.use(errorHandler);

export const startServer = async (): Promise<ReturnType<typeof app.listen>> => {
  await initializeDatabase();
  await migrate(db, { migrationsFolder: "./drizzle" });
  return app.listen(config.port, () => {
    console.log(`SongBattle API listening on port ${config.port}.`);
  });
};

const shutdown = (server: ReturnType<typeof app.listen>): void => {
  server.close(() => {
    sqliteClient.close();
    process.exit(0);
  });
};

const isMainModule = process.argv[1]
  ? fileURLToPath(import.meta.url) === process.argv[1]
  : false;

if (isMainModule) {
  const server = await startServer();
  process.once("SIGINT", () => shutdown(server));
  process.once("SIGTERM", () => shutdown(server));
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
