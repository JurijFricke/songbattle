import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "vitest/config";

// Every test run gets a throwaway SQLite database so tests never touch the
// developer or production database. Files run sequentially because they share
// this database.
const databaseDirectory = mkdtempSync(join(tmpdir(), "songbattle-vitest-"));

process.on("exit", () => {
  try {
    rmSync(databaseDirectory, { recursive: true, force: true });
  } catch {
    // Cleanup is best effort; leftover temp directories are harmless.
  }
});

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: false,
    fileParallelism: false,
    env: {
      DATABASE_URL: `file:${databaseDirectory.replace(/\\/g, "/")}/test.db`,
    },
  },
});
