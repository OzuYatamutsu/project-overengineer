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
RUN pnpm install
RUN pnpm --filter @project-overengineer/shared-lib build

FROM deps AS launch
WORKDIR /app
COPY janitor ./janitor
RUN pnpm install
RUN pnpm --filter @project-overengineer/janitor build

USER nodejs
CMD ["node", "janitor/dist/worker.js"]