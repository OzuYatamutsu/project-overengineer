import { defineConfig } from '@playwright/test'

export default defineConfig({
  webServer: {
    command: 'npx ts-node server.ts',
    port: 3001,
    reuseExistingServer: !process.env.CI,
  },
})