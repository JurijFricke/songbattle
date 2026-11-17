import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "./server.js";
import { db, initializeDatabase } from "./database/client.js";
import { migrate } from "drizzle-orm/libsql/migrator";

beforeAll(async () => {
  await initializeDatabase();
  await migrate(db, { migrationsFolder: "./drizzle" });
});

describe("API routes", () => {
  it("returns a health response without requiring Spotify credentials", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.database.connected).toBe(true);
    expect(response.body).toHaveProperty("spotify.configured");
  });

  it("rejects conflicting song source parameters", async () => {
    const response = await request(app).get(
      "/api/songs?count=16&decade=1990s&genre=rock",
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe(400);
  });
});
