import { defineConfig } from '@playwright/test'

export default defineConfig({
  webServer: {
    command: 'node dist/server.js',
    reuseExistingServer: !process.env.CI,
  },
})