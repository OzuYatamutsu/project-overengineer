import { defineConfig } from '@playwright/test'

export default defineConfig({
  webServer: {
    command: 'echo 1',
    env: {
      ...process.env,
      REDIS_HOST: process.env.REDIS_HOST || 'localhost',
      REDIS_PORT: process.env.REDIS_PORT || '6379',
      REDIS_PASSWORD: process.env.REDIS_PASSWORD || 'b4yscx92yksfyv9c'
    },
    stdout: 'pipe',
    stderr: 'pipe'
  },
})