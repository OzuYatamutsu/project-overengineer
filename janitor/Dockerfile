FROM node:18-alpine AS base

FROM base AS deps
WORKDIR /app
ENV NODE_ENV=production
ENV CI=true

# Install local vault certificates
RUN apk add --no-cache ca-certificates 
COPY vault/vault-ca.crt /usr/local/share/ca-certificates/vault-ca.crt
RUN update-ca-certificates

# DEBUG
RUN apk add --no-cache openssl
RUN grep "vault" /etc/ssl/certs/ca-certificates.crt
# RUN openssl s_client -connect svc-vault.default.svc.cluster.local:8200 -CAfile /usr/local/share/ca-certificates/vault-ca.crt

COPY shared-lib ./shared-lib
COPY package.json pnpm-workspace.yaml ./
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
RUN corepack enable pnpm
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @project-overengineer/shared-lib build

FROM deps AS launch
WORKDIR /app
COPY janitor ./janitor
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @project-overengineer/janitor build

# For /healthz endpoint
EXPOSE 3000

USER nodejs
CMD ["node", "janitor/dist/worker.js"]