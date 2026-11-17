FROM node:26.13.1-bookworm-slim AS build

RUN npm install --global pnpm@12.18.0
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile

COPY apps/backend apps/backend
COPY packages/contracts packages/contracts
RUN pnpm --filter @songbattle/backend build
RUN pnpm deploy --filter @songbattle/backend --prod /out
RUN cp -R apps/backend/dist /out/dist
RUN cp -R apps/backend/drizzle /out/drizzle

FROM node:26.13.1-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL=file:/data/songbattle.db
WORKDIR /app

COPY --from=build /out ./

RUN mkdir -p /data && chown -R node:node /app /data
USER node
EXPOSE 3001
CMD ["node", "dist/server.js"]
