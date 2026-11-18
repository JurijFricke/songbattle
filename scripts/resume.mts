/**
 * Prepares a checkout for work on any machine.
 *
 * Usage: pnpm resume
 *
 * Fetches, refuses to continue on a dirty tree, fast-forwards, and installs
 * dependencies only when the lockfile or node_modules is out of date.
 */
import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

// Anchor to the repository root so the script behaves identically whether it is
// started from inside the repo, via `pnpm -C <repo>`, or by absolute path.
process.chdir(resolve(import.meta.dirname, ".."));

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

// Node 24+ refuses to spawn .cmd shims without a shell on Windows. Calling
// cmd.exe directly avoids both that restriction and the DEP0190 warning that
// `shell: true` produces.
const runPnpm = (
  args: readonly string[],
  options: { capture?: boolean } = {},
): string =>
  process.platform === "win32"
    ? run("cmd.exe", ["/d", "/s", "/c", pnpmCommand, ...args], options)
    : run(pnpmCommand, args, options);

const main = (): void => {
  console.log("=== git fetch ===");
  run("git", ["fetch", "origin", "--prune"]);

  const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    capture: true,
  });
  const dirty = run("git", ["status", "--porcelain"], { capture: true });
  if (dirty !== "") {
    console.error(
      `\nWorking tree on ${branch} has uncommitted changes:\n${dirty}\n\n` +
        'Run `pnpm checkpoint "type(scope): message"` on the machine that made them, ' +
        "or stash them before resuming.",
    );
    process.exit(1);
  }

  console.log(`\n=== git pull --ff-only (${branch}) ===`);
  run("git", ["pull", "--ff-only", "origin", branch]);

  const modulesMarker = "node_modules/.modules.yaml";
  const installNeeded =
    !existsSync(modulesMarker) ||
    statSync("pnpm-lock.yaml").mtimeMs > statSync(modulesMarker).mtimeMs;

  if (installNeeded) {
    console.log("\n=== pnpm install --frozen-lockfile ===");
    runPnpm(["install", "--frozen-lockfile"]);
  } else {
    console.log("\nDependencies already match the lockfile; skipping install.");
  }

  const head = run("git", ["rev-parse", "--short", "HEAD"], { capture: true });
  const nodeVersion = process.version;
  const pnpmVersion = runPnpm(["--version"], { capture: true });

  console.log(
    [
      "",
      "=== ready ===",
      `branch: ${branch}`,
      `commit: ${head}`,
      `node:   ${nodeVersion}`,
      `pnpm:   ${pnpmVersion}`,
      "",
      "Read CONTEXT.md, then continue with the first incomplete item in",
      '"Next steps, in order".',
    ].join("\n"),
  );
};

main();
