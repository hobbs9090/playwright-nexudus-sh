import type { PlaywrightTestConfig } from '@playwright/test'
import { devices } from '@playwright/test'
import * as dotenv from 'dotenv'

dotenv.config({ quiet: true })

const requiredEnvVars = ['NEXUDUS_EMAIL', 'NEXUDUS_PASSWORD'] as const
const missingRequiredEnvVars = requiredEnvVars.filter((name) => !process.env[name]?.trim())
const viewport = { width: 1280, height: 1200 }
const headedWindowChromeHeight = 100
const headedWindowSize = `${viewport.width},${viewport.height + headedWindowChromeHeight}`

if (missingRequiredEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingRequiredEnvVars.join(', ')}. Set them before running the Playwright suite.`,
  )
}

const isCI = !!process.env.CI
const isCircleCI = !!process.env.CIRCLECI
const headless = (process.env.PLAYWRIGHT_HEADLESS || '').toLowerCase() === 'true' || isCI
const reporter = isCircleCI
  ? [['line'], ['junit', { outputFile: 'test-results/results.xml' }], ['html', { open: 'never' }]]
  : isCI
    ? [['github'], ['junit', { outputFile: 'test-results/results.xml' }], ['html', { open: 'never' }]]
    : 'html'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig = {
  testDir: './tests',
  /* Maximum time one test can run for. */
  timeout: 60 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 5000,
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: isCI,
  /* Retry on CI only */
  retries: isCI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: isCI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.NEXUDUS_BASE_URL || 'https://dashboard.nexudus.com/',
    headless,
    viewport,
    screen: viewport,
    video: 'on',
    screenshot: 'on',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'Chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport,
        screen: viewport,
        ...(headless
          ? {}
          : {
              launchOptions: {
                args: [`--window-size=${headedWindowSize}`],
              },
            }),
      },
    },

    // {
    //   name: 'Google Chrome',
    //   use: {
    //     channel: 'chrome',
    //   }
    // },

    // {
    //   name: 'Firefox',
    //   use: {
    //     ...devices['Desktop Firefox'],
    //   },
    // },

    // {
    //   name: 'Webkit',
    //   use: {
    //     ...devices['Desktop Safari'],
    //   },
    // },

    // /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: {
    //     ...devices['Pixel 5'],
    //   },
    // },

    // {
    //   name: 'Mobile Safari',
    //   use: {
    //     ...devices['iPhone 12'],
    //   },
    // },

    // /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: {
    //     channel: 'msedge',
    //   },
    // },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: 'test-results/',

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   port: 3000,
  // },
}

export default config
