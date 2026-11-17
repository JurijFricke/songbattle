# SongBattle Continuation Context

Updated after Step 14C. This file contains decisions, verified progress, known
limitations, and the next execution sequence. It contains no secrets.

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

Current branch is `dev`; working tree was clean at this checkpoint.

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
- Backend vote idempotency, session ownership semantics, and database foreign
  keys need a final review before production.
- `CORS_ORIGIN` and production security headers need final same-origin/Caddy
  configuration.
- SSH password/root-login hardening was planned but not yet performed; verify
  key-only login before production.
- Oracle Always Free status must be monitored in the OCI console. The design
  avoids paid managed services but cannot guarantee an Oracle billing outcome.
- The VM has no configured automated off-VM application backup yet. Backup and
  restore must be implemented and tested before production data matters.

## Next steps, in order

1. Run backend vote/session completion/statistics integration tests against the
   real SQLite database.
2. Test the complete frontend battle flow using the local Vite proxy:
   start game → load Embeds → vote → next matchup → winner → stats.
3. Test official Spotify Embeds manually while logged out, logged into Free if
   available, and logged into Premium; verify playback, scrubbing, save/like
   behavior, and browser privacy behavior.
4. Add deterministic mocked browser E2E coverage alongside the real integration
   flow test; the current Playwright test uses the local Spotify credentials and
   the public playlist fixture.
5. Add deterministic mocked browser E2E coverage alongside the real integration
   flow test; the current Playwright test uses the local Spotify credentials and
   the public playlist fixture.
6. Run dependency/security audits and reduce the temporary pnpm build-script
   allowlist after the old CRA dependency tree is fully gone.
7. Add Podman Quadlet units, Caddy configuration, ARM64-compatible builds,
   persistent volume layout, health checks, and rollback commands.
8. Configure a free domain/DNS when available:

```text
example-domain → production
staging.example-domain → staging
```

9. Configure staging on the VM with separate SQLite/cache data, then validate
     deployment from `dev`.
10. Harden SSH, verify OCI ingress/UFW after Caddy is ready, and configure
     scheduled SQLite backups plus a tested restore procedure.
11. Extend GitHub Actions with staging/production deployment after the VM
    deployment files are validated.
12. Promote the validated `dev` state to `main`, deploy production, and retain
     old GitHub repositories until the user explicitly approves retirement.

## Latest commits on active dev

```text
d4bf31e chore: enforce repository quality gates
0468180 feat(backend): harden Spotify cache and rate limits
1937a18 feat(backend): harden battle session persistence
d6a3b88 docs: add project continuation context
97445d4 fix(backend): use current Spotify playlist items endpoint
3607a5c test(frontend): add UI and API client coverage
536777d feat(frontend): modernize responsive and accessible UI
b61d680 feat(frontend): migrate CRA to Vite and Spotify Embeds
abe1885 test(backend): cover API validation routes
```
