import { defineConfig } from '@playwright/test'

export default defineConfig({
  webServer: {
    command: 'TS_NODE_TRANSPILE_ONLY=1 ts-node server.ts',
    reuseExistingServer: false,
    env: {
      ...process.env,
      REDIS_HOST: process.env.REDIS_HOST || 'localhost',
      REDIS_PORT: process.env.REDIS_PORT || '6379',
      REDIS_PASSWORD: process.env.REDIS_PASSWORD || 'b4yscx92yksfyv9c',
      STATUS_API_PORT: process.env.STATUS_API_PORT || '3001'
    },
    stdout: 'pipe',
    stderr: 'pipe'
  },
})