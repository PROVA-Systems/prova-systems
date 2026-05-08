// @ts-check
/**
 * PROVA — Playwright Config M⁴² Suite
 * 5 spec.js Tests gegen Live-prova-systems.de für Pre-Pilot-Verification
 *
 * Run: npx playwright test --config=playwright.m42.config.js
 */

const { defineConfig, devices } = require('@playwright/test');

try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) { /* optional */ }

module.exports = defineConfig({
  testDir: './tests/e2e-m42',
  testMatch: /.*\.spec\.js$/,
  timeout: 90 * 1000,
  expect: { timeout: 15 * 1000 },

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,

  reporter: [
    ['html', { outputFolder: 'playwright-report-m42', open: 'never' }],
    ['list']
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://prova-systems.de',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 PlaywrightTest-M42',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14 Pro'] } }
  ],
});
