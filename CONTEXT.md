# SongBattle Continuation Context

Updated at session close, 2026-11-17, after commit `7bb4e54`. This file contains
decisions, verified progress, known limitations, and the next execution
sequence. It contains no secrets.

## Resume immediately

```powershell
cd C:\Users\jurij\projects\songbattle
nvm use 26.13.1
pnpm install
git status --short --branch
```

Continue on `dev`, not `main`.

TokenEconomizer is installed globally for OpenCode at
`C:\Users\jurij\tools\TokenEconomizer`, with `microskills=envfacts` and
`loopguard=nudge` enabled globally. OpenCode tool pruning is currently
unavailable on this host.

## Model selection and switching

Chosen 2026-11-17 while the Copilot Student quota was exhausted (200 AI credits
reset on 2026-12-01, additional usage deliberately not enabled).

```text
primary     opencode/glm-5.3-flash-free
escalation  opencode/hy4-flash-free
vision      opencode/nemotron-3.5-super-vl-free
offline     ollama/gemma4:12b
```

Rationale: the repository is 90 files, 41 TypeScript files, 2,523 TS LOC, and
the largest file is 405 lines. The entire source fits in a single context
window, so long-context capability is not the binding constraint. The binding
constraint is precision under the strict TypeScript configuration
(`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`)
combined with the zero-escape-hatch lint invariant. GLM-5.3 is coding-tuned for
agentic repo editing and exposes the same low/high/max effort ladder, so prompts
transfer unchanged. `hy4-flash-free` is six weeks newer and is kept for design
and cross-layer debugging rather than routine edits.

### Handoff protocol for any model

Any model taking over must:

1. Read this file before touching code; it is the authoritative state record.
2. Work on `dev`, never `main`.
3. Never weaken `tsconfig.base.json` strictness, ESLint rules, or the CI gate.
4. Never introduce `!`, `as any`, `@ts-ignore`, or `@ts-expect-error`; both
   rules are now CI-enforced errors.
5. Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and
   `pnpm build` before every commit.
6. Never commit `.env` or print Spotify credentials.
7. Update this file in the same commit as any meaningful state change.

### Optional A/B probe

To re-test the model choice, run the identical prompt on both candidates:

> Add `GET /api/stats/leaderboard?limit=N` returning the top N songs by vote
> count. Reuse the repository layer, add a Zod schema in `packages/contracts`,
> add a route test, and make `pnpm typecheck && pnpm test` pass. Do not modify
> existing tests.

Score: passes without human edit, tool calls used, and whether any escape
hatch was introduced.

## Oracle VM access

VM address:

```text
152.70.30.118
```

SSH command:

```bash
ssh ubuntu@152.70.30.118
```

Use the configured SSH key. Never place private keys, passwords, or Spotify
credentials in this file.

## User decisions and requirements

- Authoritative baseline: `origin/dev` from both original repositories.
- New GitHub repository: `git@github.com:JurijFricke/songbattle.git`.
- Git strategy: clean new `main` and `dev`; preserve original histories in archive branches.
- Deployment: Oracle Cloud VM, eventually replacing Netlify/Render.
- VM: `ubuntu@152.70.30.118`, Ubuntu 24.04 LTS Minimal, ARM64/aarch64, 1 CPU, ~6 GB RAM, ~100 GB disk.
- Domain: not obtained yet; user plans to find a free student domain in Germany.
- Production and staging: same VM, separate containers/databases/configuration; staging may wait until DNS exists.
- Toolchain: current stable LTS only; no alpha/beta. Local development uses Node `26.13.1` and pnpm `12.18.0`.
- Browser target: current Chrome, Firefox, Safari, and Edge.
- API compatibility: not required; API may be redesigned.
- Backend: strict TypeScript, ESM, Express, Drizzle, SQLite, Zod, native `fetch` Spotify client.
- Database: fresh persistent SQLite; old MongoDB/database data may be discarded.
- Persistent data: song/provider cache, playlist cache, battle sessions, votes, statistics.
- No SongBattle authentication. Spotify account behavior is delegated to the official Embed iframe.
- Spotify source modes: random, decade, genre, and playlist.
- Spotify player: official track Embed with playback controls; user-controlled Vote button below it.
- Cache policy: database-backed cache, bounded Spotify refresh, rate limits, and max cache size; hybrid threshold/periodic policy remains to be finalized.
- Package manager: pnpm workspaces.
- VM runtime: rootless Podman with systemd/Quadlet and Caddy; Docker was only temporary.
- CI preference: `dev` should validate/deploy staging; `main` should deploy production after approval. Quality-gate GitHub Actions CI is implemented; deployment workflows remain.
- History archive branch names accepted:
  - `archive/frontend-main`
  - `archive/frontend-dev`
  - `archive/backend-main`
  - `archive/backend-dev`
- Anonymous history behavior: votes are global statistics while battle sessions identify individual anonymous games.
- Spotify test account: user has Premium and can test logged-in and private/logged-out browser cases.

## Repository state

Active repository:

```text
C:\Users\jurij\projects\songbattle
```

Current branch is `dev`; working tree is clean and level with `origin/dev` at
`7bb4e54`. CI passed on that commit; the VM checkout was fast-forwarded to it.
Nothing is running or exposed on the VM; no Quadlet unit is started or enabled.
The next session resumes at step 1 of "Next steps" below.

Branches:

```text
main                  clean pre-migration baseline
dev                   active migration branch
archive/frontend-main original frontend main history
archive/frontend-dev  original frontend dev history
archive/backend-main  original backend main history
archive/backend-dev   original backend dev history
```

The original work and the first VM migration attempt are preserved outside the
active repository at:

```text
C:\Users\jurij\projects\songbattle_old
```

The new GitHub remote is configured and the current `main`, `dev`, and archive
branches have been pushed. Do not force-push or delete the original GitHub
repositories until production validation is complete.

## Completed work

### Infrastructure safety

- Oracle boot-volume backup created:
  - name: `Backup before songbattle migration`
  - status: completed
- Old VM checkout archived locally and removed from the VM.
- Oracle subnet Security List restricted to public TCP 22, 80, and 443; SSH is
  intentionally globally reachable for now because the user selected Option B.
- Ubuntu UFW enabled:
  - incoming denied by default
  - outgoing allowed by default
  - SSH rate-limited
  - ports 80/443 allowed
- `rpcbind` disabled; port 111 closed.
- 2 GB swap created and persisted; swappiness set to 10.
- Rootless Podman installed and verified.
- Docker and Docker data removed after Podman verification.

### Git/monorepo

- Clean monorepo structure:

```text
apps/frontend
apps/backend
packages/contracts
```

- Root pnpm workspace, strict shared TypeScript config, Prettier config, root
  README, and ignore rules added.
- Active migrations are on `dev`; `main` remains unchanged at the clean
  pre-migration baseline.

### Backend

- Backend application source is fully TypeScript; old backend JavaScript was
  removed from the active tree.
- Drizzle schema/migrations cover:
  - songs and structured Spotify Embed metadata
  - playlist cache
  - cache refresh state
  - battle sessions
  - battle votes
  - song statistics
- Shared `@songbattle/contracts` package uses Zod schemas and inferred types.
- Spotify client uses native `fetch`, client-credentials tokens, typed response
  parsing, and current playlist-items endpoint.
- Structured Embed data replaces arbitrary backend-generated HTML.
- API includes health, songs, votes, session completion, and stats endpoints.
- Helmet, JSON body limits, CORS, rate limiting, graceful shutdown, and
  structured error handling are present.
- Backend tests exist for Embed generation, normalization, bracket logic,
  validation, health, and API routes.
- Battle persistence is hardened with session membership, foreign keys,
  idempotent votes, transactional statistics, and duplicate cleanup during the
  `0002_tiny_lord_hawal.sql` migration.
- Spotify/cache hardening includes bounded 429 retries, Retry-After
  propagation, single-flight refreshes, cache TTL cleanup, and cache-size
  pruning.

### Frontend

- Create React App replaced with Vite.
- Strict TypeScript; no `allowJs`; no CRA runtime files remain.
- Official Spotify track Embed rendered through a controlled iframe with a
  descriptive title and playback permissions.
- Shared contracts/API client integrated.
- Random, decade, genre, and playlist source controls implemented.
- Responsive and accessible UI pass completed:
  - semantic landmarks and form structure
  - skip link
  - fieldsets/legends/labels/names
  - focus-visible styles
  - responsive grid/container queries
  - design tokens/cascade layers
  - light/dark and forced-colors support
  - reduced-motion handling
  - native progress element
- Frontend tests exist for the Spotify player, start form, and API response
  validation.
- Active Netlify configuration removed; old config remains in archive sources.
- Root ESLint flat configuration, Prettier enforcement, contracts typechecking,
  and GitHub Actions CI are active.
- Generated `pnpm-lock.yaml` is intentionally excluded from Prettier checks to
  avoid version-dependent cosmetic rewrites; dependency integrity remains
  enforced by `pnpm install --frozen-lockfile` and the audit step.
- Production dependency audit is clean after upgrading Drizzle ORM to the
  patched `>=0.45.2` line.
- GitHub Actions CI run `44064223408` passed the complete quality job after
  route tests were changed to initialize their own migrated database.
- ARM64 Podman deployment scaffolding is committed under `infra/`, including
  multi-stage Node/Caddy images, Caddy routing, production env template, and
  rootless Quadlet units. It is not activated on the VM yet.
- ARM64 image validation passed on the Oracle VM: `songbattle-api:dev` and
  `songbattle-web:dev` built successfully. The VM checkout is
  `/home/ubuntu/projects/songbattle`; no services were started.
- VM checkout relocated from `/home/ubuntu/songbattle` to
  `/home/ubuntu/projects/songbattle`. Quadlet `EnvironmentFile`/`Volume`
  specifiers, `infra/README.md`, and `production.env.example` now use
  `%h/projects/songbattle/...`. Runtime state paths on the VM are
  `~/projects/songbattle/{data,caddy-data,caddy-config,production.env}`.
- Relocation verified on the VM: checkout fast-forwarded to `ad58b33`, the
  Quadlet units were copied to `~/.config/containers/systemd/` and
  `systemctl --user daemon-reload` expanded `%h/projects/songbattle/...`
  correctly in both generated units. No stale `/home/ubuntu/songbattle`
  reference exists in `~/.config`, `~/.bashrc`, `~/.profile`, crontab, or
  `/etc/systemd/system`. No unit was enabled or started.
- Open gap closed: the VM images are now tagged both `:dev` and `:latest`, so
  the Quadlet references resolve. Units are installed and generated by the
  Quadlet generator but remain `inactive` and not `enabled`, so nothing starts
  on boot and nothing is exposed.
- CI run `44067149685` passed on `86e7af5` (35s) after the relocation.
- Strict-TypeScript escape hatches are now lint-enforced errors:
  `@typescript-eslint/no-non-null-assertion` and
  `@typescript-eslint/no-explicit-any`. This matters because free-tier models
  default to `!` and `as any` to silence `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`.
- The three pre-existing non-null assertions were removed properly:
  `domain/bracket.ts` uses a total `at()` accessor that throws `RangeError` on an
  impossible index, and `spotify/client.ts` narrows `retryAfterSeconds` with an
  explicit `!== undefined` check before `Number.isFinite`. No rule was
  suppressed, no assertion remains.
- `@typescript-eslint/no-unused-vars` now follows the codebase's `_`-prefix
  convention (`argsIgnorePattern`/`varsIgnorePattern`), needed for the mandatory
  fourth parameter of Express error middleware.
- Backend tests are fully isolated from real databases: `vitest.config.ts`
  creates a throwaway SQLite database per run via `test.env.DATABASE_URL` and
  deletes it on exit; `fileParallelism: false` keeps the shared run database
  consistent.
- Backend integration coverage now includes a real-SQLite suite
  (`repository.integration.test.ts`, 10 tests): song persistence roundtrips
  including optional fields, FK enforcement on session songs, unique
  `(session_id, matchup_number)` at the database level, transactional statistics
  with `wins + losses === appearances`, leaderboard ordering, precise
  `BattleVoteError` statuses (400/404/409), duplicate-vote idempotency,
  session-completion semantics, playlist-cache expiry, and cache pruning that
  protects session/statistics songs. HTTP-level lifecycle coverage in
  `routes.test.ts` (15 tests) exercises the full vote/complete/stats request
  path with a seeded session, no Spotify dependency.
- The suite is deterministic across runs (verified 5x) despite file-order
  variation: cross-file leaderboard assertions use dominant-record and ordering
  properties instead of exact membership.
- Production bug found and fixed by the new tests: `server.ts` declared the
  Express error handler with three parameters, so Express treated it as normal
  middleware and every thrown `BattleVoteError`/`SpotifyApiError` fell through
  to the default HTML error page. The JSON error contract
  (`{ error: { code, message } }`) never actually executed. The handler now has
  the required four-parameter arity and structured JSON errors are asserted.
- `completeBattleSession` semantics hardened: completing an already-complete
  session with the same winner stays idempotent (204), while a different winner
  now returns 409 instead of silently no-oping.

### Verified commands

These passed during the session:

```bash
pnpm --filter @songbattle/backend typecheck
pnpm --filter @songbattle/backend test
pnpm --filter @songbattle/backend build
pnpm --filter @songbattle/frontend typecheck
pnpm --filter @songbattle/frontend test
pnpm --filter @songbattle/frontend build
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @songbattle/frontend test:e2e
```

Frontend modernization scan currently reports zero deterministic findings:

```text
38 guides checked, 52 rules checked, 0 findings
```

### Real Spotify integration

With local backend `.env` credentials configured (never commit or share them):

- random source returned 16 songs
- decade source returned 16 songs
- genre source returned 16 songs
- user playlist `3q9Fh1QK2OMBHh3FIHE7kV` returned 16 playable songs
- official Embed URLs were returned, e.g. `/embed/track/{id}`
- playlist cache was verified in SQLite with 387 cached tracks
- current Spotify endpoint is `/playlists/{id}/items`; `/tracks` is deprecated

## Important known issues/caveats

- Spotify Embed behavior cannot be guaranteed for every account/track. Full
  playback, scrubbing, saving/liking, region availability, Premium behavior,
  and third-party cookie behavior must be tested in real browsers.
- The first repeated playlist request returns a different song order by design;
  bracket selection is randomized while source data is cached.
- Manual keyboard, screen-reader, mobile, and cross-browser testing remains.
- Vite builds emit non-fatal upstream Rollup warnings about annotation comments
  in Zod’s distributed source.
- The root build/test scripts currently use `--if-present`; the final CI gate
  should explicitly require every app/package to expose the required scripts.
- Backend vote idempotency, session ownership, foreign keys, completion
  semantics, and statistics aggregation are covered by real-SQLite integration
  tests. Remaining review item: vote completion is guarded by
  `completedAt IS NULL`, but two truly concurrent votes could interleave at
  await points; acceptable for the single-process deployment, revisit only if
  the API ever scales horizontally.
- `CORS_ORIGIN` and production security headers need final same-origin/Caddy
  configuration.
- SSH password/root-login hardening was planned but not yet performed; verify
  key-only login before production.
- Oracle Always Free status must be monitored in the OCI console. The design
  avoids paid managed services but cannot guarantee an Oracle billing outcome.
- The VM has no configured automated off-VM application backup yet. Backup and
  restore must be implemented and tested before production data matters.

## Next steps, in order

1. Test the complete frontend battle flow using the local Vite proxy:
   start game → load Embeds → vote → next matchup → winner → stats.
2. Test official Spotify Embeds manually while logged out, logged into Free if
   available, and logged into Premium; verify playback, scrubbing, save/like
   behavior, and browser privacy behavior.
3. Add deterministic mocked browser E2E coverage alongside the real integration
   flow test; the current Playwright test uses the local Spotify credentials and
   the public playlist fixture.
4. Reduce the temporary pnpm build-script allowlist now that the old CRA
   dependency tree is gone.
5. Images are already built and tagged `:latest` on the VM. Remaining: create
   `production.env` with real credentials, start the Quadlet units, verify Caddy
   persistence and the API health path, then test rollback.
6. Configure a free domain/DNS when available:

```text
example-domain → production
staging.example-domain → staging
```

7. Configure staging on the VM with separate SQLite/cache data, then validate
   deployment from `dev`.
8. Harden SSH, verify OCI ingress/UFW after Caddy is ready, and configure
   scheduled SQLite backups plus a tested restore procedure.
9. Extend GitHub Actions with staging/production deployment after the VM
   deployment files are validated.
10. Promote the validated `dev` state to `main`, deploy production, and retain
    old GitHub repositories until the user explicitly approves retirement.

## Latest commits on active dev

```text
7bb4e54 test(backend): real-SQLite integration suite; fix Express error handler arity
65f7fe4 chore(lint): forbid non-null assertions and explicit any
adfde9d docs: record retagged images and green CI
86e7af5 docs: record VM path relocation
ad58b33 chore(infra): move VM checkout to ~/projects/songbattle
b142796 docs: record ARM64 image validation
d03cc82 fix(infra): qualify Caddy image registry
71029c2 docs: record deployment scaffold
92cb834 feat(infra): add ARM64 Podman deployment scaffold
7086832 docs: record green CI run
6b73ffa test(backend): initialize database in route tests
1ca0dd3 docs: record CI formatting fix
```
