FROM node:18-alpine AS base

FROM base AS deps
WORKDIR /app
ENV NODE_ENV=production
ENV CI=true

COPY . .
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
RUN corepack enable pnpm
RUN pnpm install --frozen-lockfile

WORKDIR /app/shared-lib
RUN pnpm build

FROM deps AS launch
WORKDIR /app/janitor
RUN pnpm build

USER nodejs
WORKDIR /app
CMD ["node", "janitor/dist/worker.js"]