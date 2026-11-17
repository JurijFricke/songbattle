import { migrate } from 'drizzle-orm/libsql/migrator';
import { db, sqliteClient } from './client.js';

await migrate(db, { migrationsFolder: './drizzle' });
sqliteClient.close();
