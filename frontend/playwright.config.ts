import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e', fullyParallel: true, retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'on-first-retry', screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm run dev -- --port 3000',
    url: 'http://127.0.0.1:3000/en/login',
    reuseExistingServer: !process.env.CI,
    env: { NEXT_PUBLIC_API_URL: '/api/v1' },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
