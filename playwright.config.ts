import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.04,
    },
  },
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 960, height: 600 },
  },
  // Auto-start dev server when not already running
  webServer: {
    command: 'npm run dev -- --port 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
