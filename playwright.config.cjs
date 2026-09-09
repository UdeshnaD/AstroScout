const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./tests/browser",
  timeout: 120000,
  workers: 1,
  retries: 0,
  use: {
    baseURL: process.env.ASTROSCOUT_URL || "http://localhost:3000",
    viewport: { width: 1366, height: 900 },
    headless: true,
    screenshot: "only-on-failure",
  },
});
