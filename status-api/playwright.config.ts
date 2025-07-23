import { defineConfig } from '@playwright/test'

export default defineConfig({
  webServer: {
    command: 'node dist/server.js',  // Or however you start the WS server
    port: 3001,
    reuseExistingServer: !process.env.CI,
  },
})