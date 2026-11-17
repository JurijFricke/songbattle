import { migrate } from "drizzle-orm/libsql/migrator";
import { db, initializeDatabase, sqliteClient } from "./client.js";

await initializeDatabase();
await migrate(db, { migrationsFolder: "./drizzle" });
sqliteClient.close();
