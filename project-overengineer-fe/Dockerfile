FROM node:18-alpine AS base

FROM base AS deps
WORKDIR /app
ENV NODE_ENV=production
ENV CI=true
ENV NODE_OPTIONS=--use-openssl-ca

# Install local vault certificates
RUN apk add --no-cache ca-certificates 
COPY vault/vault-ca.crt /usr/local/share/ca-certificates/vault-ca.crt
RUN update-ca-certificates --verbose

COPY shared-lib ./shared-lib
COPY package.json pnpm-workspace.yaml ./
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN corepack enable pnpm
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @project-overengineer/shared-lib build

FROM deps AS launch
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1
ENV STATUS_API_URL="ws://localhost:3001"
# ENV SENTINEL_HOST
ENV SENTINEL_PORT=26379
ENV TRANSFORMER_PORT=3000

WORKDIR /app
COPY project-overengineer-fe ./project-overengineer-fe
RUN corepack enable pnpm
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @project-overengineer/project-overengineer-fe build
RUN ln -s /app/project-overengineer-fe/.next/static /app/project-overengineer-fe/.next/standalone/project-overengineer-fe/.next/static
RUN ln -s /app/project-overengineer-fe/.next/static /app/project-overengineer-fe/.next/standalone/project-overengineer-fe/.next/server/app/static

USER nextjs
WORKDIR /app/project-overengineer-fe
CMD ["node", ".next/standalone/project-overengineer-fe/server.js"]
