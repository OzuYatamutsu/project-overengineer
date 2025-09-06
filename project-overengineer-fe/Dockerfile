FROM node:18-alpine AS base

FROM base AS deps
WORKDIR /app
ENV NODE_ENV=production
ENV CI=true

COPY shared-lib ./shared-lib
COPY package.json pnpm-workspace.yaml ./
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN corepack enable pnpm
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @project-overengineer/shared-lib build

FROM deps AS launch
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1
ENV STATUS_API_URL="${STATUS_API_URL:-ws://localhost:3001}"
ENV SENTINEL_HOST="${SENTINEL_HOST:-redis-sentinel}"
ENV SENTINEL_PORT="${SENTINEL_PORT:-26379}"
ENV TRANSFORMER_PORT="${TRANSFORMER_PORT:-3000}"

WORKDIR /app
COPY project-overengineer-fe ./project-overengineer-fe
RUN corepack enable pnpm
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @project-overengineer/project-overengineer-fe build

USER nextjs
CMD ["node", "project-overengineer-fe/.next/standalone/project-overengineer-fe/server.js"]
