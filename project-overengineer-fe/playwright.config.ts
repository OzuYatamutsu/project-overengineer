import { defineConfig } from '@playwright/test'

export default defineConfig({
  webServer: {
    command: 'pnpm dev', // or `npm run dev`
    url: 'http://localhost:3000',
    reuseExistingServer: true, // speeds up re-runs
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
})