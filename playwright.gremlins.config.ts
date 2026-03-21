import type { PlaywrightTestConfig } from '@playwright/test'
import { devices } from '@playwright/test'
import { loadEnvironmentFiles, shouldUseHeadlessBrowser } from './helpers'
import { getBaseURL, testEnvironments } from './test-environments'

loadEnvironmentFiles()

const viewport = { width: 1280, height: 1200 }
const isCI = !!process.env.CI
const headless = shouldUseHeadlessBrowser()
const reporter = isCI
  ? [['github'], ['html', { outputFolder: 'playwright-report/gremlins', open: 'never' }]]
  : [['list'], ['html', { outputFolder: 'playwright-report/gremlins', open: 'never' }]]

const config: PlaywrightTestConfig = {
  testDir: './tests/gremlins',
  timeout: 2 * 60 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  forbidOnly: isCI,
  retries: 0,
  workers: 1,
  reporter,
  use: {
    actionTimeout: 0,
    baseURL: getBaseURL(testEnvironments[1]),
    headless,
    viewport,
    screen: viewport,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'MP Gremlins Chromium',
      testMatch: ['**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: getBaseURL(testEnvironments[1]),
        viewport,
        screen: viewport,
      },
    },
  ],
  outputDir: 'test-results/gremlins',
}

export default config
