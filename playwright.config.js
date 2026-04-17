// @ts-check
/**
 * PROVA — Playwright Config
 * Live-Tests gegen prova-systems.de
 */

const { defineConfig, devices } = require('@playwright/test');

// .env.local laden (für Test-Credentials)
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv noch nicht installiert — kein Problem, später mit npm install dotenv
}

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60 * 1000,
  expect: { timeout: 10 * 1000 },

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,

  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],

  use: {
    baseURL: 'https://prova-systems.de',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
               '(KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 PlaywrightTest',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
