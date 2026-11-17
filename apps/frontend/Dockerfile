FROM node:26.13.1-bookworm-slim AS build

RUN npm install --global pnpm@12.18.0
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile

COPY apps/frontend apps/frontend
COPY packages/contracts packages/contracts
RUN pnpm --filter @songbattle/frontend build

FROM caddy:2.10-alpine AS runtime

COPY --from=build /workspace/apps/frontend/dist /srv
COPY infra/caddy/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
