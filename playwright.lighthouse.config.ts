import type { PlaywrightTestConfig } from '@playwright/test'
import { devices } from '@playwright/test'
import { loadEnvironmentFiles, shouldUseHeadlessBrowser } from './helpers'
import { getBaseURL, getRequiredCredentialEnvVars, testEnvironments } from './test-environments'

loadEnvironmentFiles()

const requiredEnvVars = getRequiredCredentialEnvVars()
const missingRequiredEnvVars = requiredEnvVars.filter((name) => !process.env[name]?.trim())
const viewport = { width: 1280, height: 1200 }

if (missingRequiredEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingRequiredEnvVars.join(', ')}. Set them before running the Lighthouse suite.`,
  )
}

const isCI = !!process.env.CI
const headless = shouldUseHeadlessBrowser()
const reporter = isCI
  ? [['github'], ['html', { outputFolder: 'playwright-report/lighthouse', open: 'never' }]]
  : [['list'], ['html', { outputFolder: 'playwright-report/lighthouse', open: 'never' }]]

function getProjectName(projectName: string) {
  return projectName.startsWith('AP') ? 'AP Lighthouse' : 'MP Lighthouse'
}

function getTestMatch(projectName: string) {
  return projectName.startsWith('AP') ? ['ap/**/*.spec.ts'] : ['mp/**/*.spec.ts']
}

const config: PlaywrightTestConfig = {
  testDir: './tests/lighthouse',
  timeout: 2 * 60 * 1000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter,
  use: {
    headless,
    viewport,
    screen: viewport,
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: testEnvironments.map((environment) => ({
    name: getProjectName(environment.projectName),
    testMatch: getTestMatch(environment.projectName),
    use: {
      ...devices['Desktop Chrome'],
      baseURL: getBaseURL(environment),
      viewport,
      screen: viewport,
    },
  })),
  outputDir: 'test-results/lighthouse',
}

export default config
