import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';

const databaseUrl = process.env.DATABASE_URL ?? 'file:./data/songbattle.db';

const ensureLocalDatabaseDirectory = (url: string): void => {
  if (!url.startsWith('file:')) return;

  const rawPath = url.slice('file:'.length);
  const filePath = isAbsolute(rawPath) ? rawPath : resolve(process.cwd(), rawPath);
  mkdirSync(dirname(filePath), { recursive: true });
};

ensureLocalDatabaseDirectory(databaseUrl);

const databaseAuthToken = process.env.DATABASE_AUTH_TOKEN;

export const sqliteClient = createClient({
  url: databaseUrl,
  ...(databaseAuthToken ? { authToken: databaseAuthToken } : {}),
});

export const db = drizzle(sqliteClient, { schema });

export type Database = typeof db;
