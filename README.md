# SongBattle

SongBattle is a Spotify-powered song tournament application. It consists of a
React web client and a TypeScript API service in a single pnpm workspace.

## Workspace layout

```text
apps/
  backend/   TypeScript API service
  frontend/  React web application
packages/    Shared contracts and libraries
```

## Development prerequisites

- Node.js 24 LTS or newer supported LTS release below 27
- pnpm 12.18.0
- Spotify Web API application credentials for the backend

Install dependencies and run the workspace checks:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Application-specific development commands are documented in each app once its
modernized toolchain is complete.

## Deployment

Production deployment targets a single ARM64 Oracle Cloud VM using rootless
Podman, systemd/Quadlet, Caddy, and a persistent SQLite database. Deployment
configuration will be added after the application migration and test suite are
complete.
