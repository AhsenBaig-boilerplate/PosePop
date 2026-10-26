// End-to-end tests against the built site (dist/), served the way GitHub Pages serves it.
// Run with `npm run test:e2e` after `npm run build`. PW_CHROMIUM points at a local Chromium
// when Playwright can't install its own (older Linux); CI uses Playwright's.
import { defineConfig } from "@playwright/test";

const port = 8090;
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 240_000, // person detection runs on the CPU/SwiftShader in CI
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}/`,
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: {
    command: "node scripts/serve.mjs",
    env: { PORT: String(port) },
    url: `http://localhost:${port}/`,
    reuseExistingServer: false,
  },
});
