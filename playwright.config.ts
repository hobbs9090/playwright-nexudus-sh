import type { PlaywrightTestConfig } from '@playwright/test'
import { devices } from '@playwright/test'
import { loadEnvironmentFiles, shouldUseHeadlessBrowser } from './helpers'
import { getBaseURL, getMissingRequiredCredentialGroups, testEnvironments } from './test-environments'

loadEnvironmentFiles()

const missingRequiredCredentialGroups = getMissingRequiredCredentialGroups()
const viewport = { width: 1280, height: 1200 }
const headedWindowChromeHeight = 100
const headedWindowSize = `${viewport.width},${viewport.height + headedWindowChromeHeight}`

if (missingRequiredCredentialGroups.length > 0) {
  throw new Error(
    `Missing required credential configuration: ${missingRequiredCredentialGroups.join(
      '; ',
    )}. Set one complete credential pair for each group before running the Playwright suite.`,
  )
}

const isCI = !!process.env.CI
const headless = shouldUseHeadlessBrowser()
const reporter = isCI
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
    baseURL: getBaseURL(testEnvironments[0]),
    headless,
    viewport,
    screen: viewport,
    video: 'on',
    screenshot: 'on',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: testEnvironments.map((environment) => ({
    name: environment.projectName,
    testMatch: environment.testMatch,
    use: {
      ...devices['Desktop Chrome'],
      baseURL: getBaseURL(environment),
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
  })).concat([
    {
      name: 'MP Android Chrome',
      testMatch: ['tests/mp/**/*.spec.ts'],
      use: {
        ...devices['Pixel 5'],
        browserName: 'chromium',
        baseURL: getBaseURL(testEnvironments[1]),
      },
    },
    {
      name: 'MP iPhone Safari',
      testMatch: ['tests/mp/**/*.spec.ts'],
      use: {
        ...devices['iPhone 12'],
        browserName: 'webkit',
        baseURL: getBaseURL(testEnvironments[1]),
      },
    },
  ]),
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

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: 'test-results/',

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   port: 3000,
  // },
}

export default config
