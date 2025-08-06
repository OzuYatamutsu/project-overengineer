import { defineConfig } from '@playwright/test'

export default defineConfig({
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    env: {
      SENTINEL_HOST: 'localhost',
      SENTINEL_PORT: '26379',
      REDIS_PASSWORD: 'b4yscx92yksfyv9c'
    },
    stdout: 'pipe',
    stderr: 'pipe'
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
})