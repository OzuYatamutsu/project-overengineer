FROM node:18-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
USER nodejs

# Copy production deps and build output
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3001
ENV STATUS_API_PORT="${STATUS_API_PORT:-3001}"
ENV REDIS_HOST="${REDIS_HOST:-redis}"
ENV REDIS_PORT="${REDIS_PORT:-6379}"
ENV REDIS_PASSWORD="${REDIS_PASSWORD:-b4yscx92yksfyv9c}"
CMD ["node", "dist/server.js"]
