import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests of the wizard in a browser, against the fake installer. Locally they use the installed
 * Microsoft Edge (no browser download); CI installs Playwright's Chromium. SHOTS=<folder> also saves a
 * screenshot of each step there.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5181',
    channel: process.env.CI ? undefined : 'msedge',
    viewport: { width: 1280, height: 860 },
  },
  webServer: {
    command: 'pnpm exec vite --port 5181 --strictPort',
    url: 'http://localhost:5181',
    reuseExistingServer: !process.env.CI,
  },
});
