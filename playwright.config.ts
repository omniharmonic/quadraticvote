import { defineConfig, devices } from '@playwright/test';

/**
 * Hermetic e2e setup: Playwright boots the in-memory Supabase mock
 * (tests/mocks/supabase-mock.mjs) and the Next.js dev server pointed at it,
 * so the suite runs anywhere — CI included — with no live Supabase project,
 * no Docker, and no secrets.
 */
const MOCK_SUPABASE_URL = 'http://127.0.0.1:54321';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // specs share one in-memory backend; keep ordering sane
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'list' : 'html',
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Mobile coverage without needing a WebKit download — Pixel 5 runs on
      // the same Chromium binary.
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: [
    {
      command: 'node tests/mocks/supabase-mock.mjs',
      url: `${MOCK_SUPABASE_URL}/rest/v1/events?select=id`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'pnpm dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: MOCK_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'mock-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'mock-service-role-key',
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      },
    },
  ],
});
