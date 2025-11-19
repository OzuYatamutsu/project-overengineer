import { defineConfig } from '@playwright/test'

export default defineConfig({
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    env: {
      ...process.env,
      REDIS_HOST: process.env.REDIS_HOST || 'localhost',
      REDIS_PORT: process.env.REDIS_PORT || '6379',
      REDIS_PASSWORD: process.env.REDIS_PASSWORD || 'b4yscx92yksfyv9c',
      VAULT_HOST: process.env.VAULT_HOST || 'localhost',
      VAULT_PORT: process.env.VAULT_PORT || '8200',
      VAULT_RO_TOKEN: process.env.VAULT_RO_TOKEN || 'root',
      _VAULT_INSECURE_MODE: process.env._VAULT_INSECURE_MODE || 'root',
    },
    stdout: 'pipe',
    stderr: 'pipe'
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
})