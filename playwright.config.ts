import { defineConfig, devices } from '@playwright/test';

const publicUrl = process.env.E2E_PUBLIC_URL || 'https://www.autodealers-online.com';
const adminUrl = process.env.E2E_ADMIN_URL || 'https://admin.autodealers-online.com';
const sellerUrl = process.env.E2E_SELLER_URL || 'https://seller.autodealers-online.com';
const dealerUrl = process.env.E2E_DEALER_URL || 'https://dealer.autodealers-online.com';
const advertiserUrl = process.env.E2E_ADVERTISER_URL || 'https://advertiser.autodealers-online.com';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 25_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  metadata: {
    publicUrl,
    adminUrl,
    sellerUrl,
    dealerUrl,
    advertiserUrl,
  },
});
