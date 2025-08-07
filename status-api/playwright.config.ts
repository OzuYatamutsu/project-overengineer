import { defineConfig } from '@playwright/test'

export default defineConfig({
  webServer: {
    command: 'node dist/server.js',
    reuseExistingServer: false,
    env: {
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      REDIS_PASSWORD: 'b4yscx92yksfyv9c',
      STATUS_API_PORT: '3001'
    },
    stdout: 'pipe',
    stderr: 'pipe'
  },
})