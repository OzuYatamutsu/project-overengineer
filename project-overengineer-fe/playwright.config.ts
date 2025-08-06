import { defineConfig } from '@playwright/test'

export default defineConfig({
  webServer: {
    command: 'rm -rf .next && pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    env: {
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      REDIS_PASSWORD: 'b4yscx92yksfyv9c',
      SENTINEL_HOST: 'localhost',
      SENTINEL_PORT: '26379'
    },
    stdout: 'pipe',
    stderr: 'pipe'
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
})