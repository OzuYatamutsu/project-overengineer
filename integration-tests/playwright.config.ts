import { defineConfig } from '@playwright/test'

export default defineConfig({
  webServer: {
    command: 'TS_NODE_TRANSPILE_ONLY=1 ts-node worker.ts',
    reuseExistingServer: false,
    env: {},
    stdout: 'pipe',
    stderr: 'pipe'
  },
})