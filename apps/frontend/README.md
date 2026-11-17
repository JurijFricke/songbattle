# SongBattle web application

The frontend is a React 19 application built with Vite and strict TypeScript.
It consumes the backend through the same-origin `/api` path in production and
the Vite development proxy locally.

```bash
pnpm --filter @songbattle/frontend dev
pnpm --filter @songbattle/frontend typecheck
pnpm --filter @songbattle/frontend test
pnpm --filter @songbattle/frontend build
```
