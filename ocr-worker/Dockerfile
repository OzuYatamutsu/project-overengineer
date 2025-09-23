FROM node:18-alpine AS base

FROM base AS deps
WORKDIR /app
ENV NODE_ENV=production
ENV CI=true

COPY shared-lib ./shared-lib
COPY package.json pnpm-workspace.yaml ./
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
RUN corepack enable pnpm
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @project-overengineer/shared-lib build

FROM deps AS launch
ENV SENTINEL_HOST="${SENTINEL_HOST:-redis-sentinel}"
ENV SENTINEL_PORT="${SENTINEL_PORT:-26379}"
ENV REDIS_HOST="${REDIS_HOST:-redis}"
ENV REDIS_PORT="${REDIS_PORT:-6379}"
ENV REDIS_PASSWORD="${REDIS_PASSWORD}"
WORKDIR /app

COPY ocr-worker ./ocr-worker
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @project-overengineer/ocr-worker build

USER nodejs
CMD ["node", "ocr-worker/dist/worker.js"]
