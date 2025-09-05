FROM node:18-alpine AS base

FROM base AS deps
WORKDIR /app
ENV NODE_ENV=production
ENV CI=true

COPY shared-lib ./shared-lib
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
RUN corepack enable pnpm
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @project-overengineer/shared-lib build

FROM deps AS launch
EXPOSE 3001
ENV STATUS_API_PORT="${STATUS_API_PORT:-3001}"
ENV SENTINEL_HOST="${SENTINEL_HOST:-redis-sentinel}"
ENV SENTINEL_PORT="${SENTINEL_PORT:-26379}"
ENV REDIS_PASSWORD="${REDIS_PASSWORD:-b4yscx92yksfyv9c}"
WORKDIR /app
COPY status-api ./status-api

WORKDIR /app/status-api
RUN pnpm add -D @types/express
RUN pnpm --filter @project-overengineer/status-api build

WORKDIR /app
USER nodejs
CMD ["node", "status-api/dist/server.js"]
