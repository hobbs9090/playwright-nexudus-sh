import type { PlaywrightTestConfig } from '@playwright/test'
import { devices } from '@playwright/test'
import { defineBddConfig } from 'playwright-bdd'
import { loadEnvironmentFiles, shouldUseHeadlessBrowser } from './helpers'
import { getConfiguredBaseURL } from './nexudus-config'

loadEnvironmentFiles()

const viewport = { width: 1280, height: 1200 }
const headedWindowChromeHeight = 100
const headedWindowSize = `${viewport.width},${viewport.height + headedWindowChromeHeight}`
const isCI = !!process.env.CI
const headless = shouldUseHeadlessBrowser()
const testDir = defineBddConfig({
  features: 'tests/bdd/features/**/*.feature',
  featuresRoot: 'tests/bdd/features',
  outputDir: 'tests/bdd/.features-gen',
  steps: 'tests/bdd/steps/**/*.ts',
})
const reporter = [
  ['html', { open: 'never', outputFolder: 'playwright-report/bdd' }],
  ...(isCI ? [['github']] : []),
] as PlaywrightTestConfig['reporter']

const config: PlaywrightTestConfig = {
  testDir,
  timeout: 60 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter,
  use: {
    actionTimeout: 0,
    baseURL: getConfiguredBaseURL('NEXUDUS_MP_BASE_URL'),
    headless,
    viewport,
    screen: viewport,
    video: 'on',
    screenshot: 'on',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'MP BDD Chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: getConfiguredBaseURL('NEXUDUS_MP_BASE_URL'),
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
  ],
  outputDir: 'test-results/bdd/',
}

export default config
