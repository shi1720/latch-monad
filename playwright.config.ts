import { defineConfig } from '@playwright/test';
import path from 'node:path';

export default defineConfig({
  testDir: './test',
  testMatch: /.*browser\.spec\.ts/,
  outputDir: path.resolve(import.meta.dirname, '../../work/playwright-artifacts'),
  fullyParallel: true,
  workers: 3,
  timeout: 30000,
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173', browserName: 'chromium', trace: 'retain-on-failure', screenshot: 'off' },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : { command: 'npm run dev -- --port 5173', url: 'http://127.0.0.1:5173', reuseExistingServer: true, timeout: 30000 },
});
