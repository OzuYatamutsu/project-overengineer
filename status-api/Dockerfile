FROM node:18-alpine AS base

FROM base AS deps
WORKDIR /app
ENV NODE_ENV=production
ENV CI=true

# Install local vault certificates
COPY vault.crt /usr/local/share/ca-certificates/vault.crt
RUN update-ca-certificates

COPY shared-lib ./shared-lib
COPY package.json pnpm-workspace.yaml ./
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
RUN corepack enable pnpm
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @project-overengineer/shared-lib build

FROM deps AS launch
EXPOSE 3001
ENV STATUS_API_PORT=3001
# ENV SENTINEL_HOST
ENV SENTINEL_PORT=26379
# ENV REDIS_PASSWORD

WORKDIR /app
COPY status-api ./status-api

WORKDIR /app/status-api
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @project-overengineer/status-api build

WORKDIR /app
USER nodejs
CMD ["node", "status-api/dist/server.js"]
