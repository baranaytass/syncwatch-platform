import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Video sync testleri sıralı çalışmalı
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Video sync testleri için tek worker
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'cd ../backend && npm run dev',
      port: 3001,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm start',
      port: 3000,
      reuseExistingServer: !process.env.CI,
    }
  ],
}); 