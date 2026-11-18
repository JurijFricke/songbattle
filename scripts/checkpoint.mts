/**
 * Commits and pushes every change, including an updated CONTEXT.md entry.
 *
 * Usage: pnpm checkpoint "feat(scope): message"
 *
 * Runs the full quality gate first so a checkpoint can never publish a red
 * tree. Works on Windows and macOS/Linux without extra dependencies.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const CONTEXT_PATH = "CONTEXT.md";
const LOG_HEADING = "## Checkpoint log";
const MAX_LOG_ENTRIES = 20;
const GATE_STEPS = [
  "format:check",
  "lint",
  "typecheck",
  "test",
  "build",
] as const;

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const run = (
  command: string,
  args: readonly string[],
  options: { capture?: boolean; shell?: boolean } = {},
): string => {
  const capture = options.capture ?? false;
  try {
    const output = execFileSync(command, [...args], {
      encoding: "utf8",
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
      shell: options.shell ?? false,
    });
    return capture ? output.trim() : "";
  } catch {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
};

// Node 24+ refuses to spawn .cmd shims without a shell on Windows.
const runPnpm = (
  args: readonly string[],
  options: { capture?: boolean } = {},
) =>
  run(pnpmCommand, args, {
    ...options,
    shell: process.platform === "win32",
  });

const git = (args: readonly string[]): string =>
  run("git", args, { capture: true });
const gitInherit = (args: readonly string[]): void => {
  run("git", args);
};

const runGate = (): void => {
  for (const step of GATE_STEPS) {
    console.log(`\n=== pnpm ${step} ===`);
    runPnpm(["run", step]);
  }
};

const updateContextLog = (branch: string, message: string): void => {
  const original = readFileSync(CONTEXT_PATH, "utf8");
  const timestamp = `${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`;
  const entry = `- ${timestamp} — ${branch} — ${message}`;
  const lines = original.split("\n");
  const headingIndex = lines.findIndex((line) => line.trim() === LOG_HEADING);

  if (headingIndex === -1) {
    lines.push("", LOG_HEADING, "", entry, "");
  } else {
    let insertAt = headingIndex + 1;
    if ((lines[insertAt] ?? "").trim() === "") insertAt += 1;
    lines.splice(insertAt, 0, entry);

    const entryIndexes: number[] = [];
    for (let index = insertAt; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      if (line.startsWith("- ")) entryIndexes.push(index);
      else if (line.trim() !== "") break;
    }
    while (entryIndexes.length > MAX_LOG_ENTRIES) {
      const removeAt = entryIndexes.pop();
      if (removeAt === undefined) break;
      lines.splice(removeAt, 1);
    }
  }

  writeFileSync(CONTEXT_PATH, lines.join("\n"), "utf8");
};

const main = (): void => {
  const message = process.argv.slice(2).join(" ").trim();
  if (!message) {
    console.error('Usage: pnpm checkpoint "type(scope): message"');
    process.exit(1);
  }

  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch === "main") {
    console.error(
      "Refusing to checkpoint on main. Switch to dev; main is promoted deliberately.",
    );
    process.exit(1);
  }

  console.log(`Checkpoint on ${branch}: ${message}`);
  runGate();

  updateContextLog(branch, message);
  gitInherit(["add", "-A"]);

  const staged = git(["diff", "--cached", "--name-only"]);
  const unpushed = git(["rev-list", "--count", `origin/${branch}..HEAD`]);
  if (staged === "" && unpushed === "0") {
    console.log("Nothing to commit and nothing unpushed. Already safe.");
    return;
  }

  if (staged !== "") {
    gitInherit(["commit", "-m", message]);
  }

  const hasUpstream = (() => {
    try {
      git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
      return true;
    } catch {
      return false;
    }
  })();

  gitInherit(
    hasUpstream ? ["push", "origin", branch] : ["push", "-u", "origin", branch],
  );

  const head = git(["rev-parse", "HEAD"]);
  const upstream = git(["rev-parse", "@{u}"]);
  const dirty = git(["status", "--porcelain"]);
  const status = head === upstream && dirty === "" ? "clean" : "NOT clean";
  console.log(
    `\nCheckpoint complete: ${branch} @ ${head.slice(0, 7)} (${status}).`,
  );
  if (status !== "clean") process.exit(1);
};

main();
