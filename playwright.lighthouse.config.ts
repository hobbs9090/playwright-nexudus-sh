import type { PlaywrightTestConfig } from '@playwright/test'
import { devices } from '@playwright/test'
import { loadEnvironmentFiles, shouldUseHeadlessBrowser } from './helpers'
import { getBaseURL, getMissingRequiredCredentialGroups, testEnvironments } from './test-environments'

loadEnvironmentFiles()

const missingRequiredCredentialGroups = getMissingRequiredCredentialGroups()
const viewport = { width: 1280, height: 1200 }

if (missingRequiredCredentialGroups.length > 0) {
  throw new Error(
    `Missing required credential configuration: ${missingRequiredCredentialGroups.join(
      '; ',
    )}. Set one complete credential pair for each group before running the Lighthouse suite.`,
  )
}

const isCI = !!process.env.CI
const headless = shouldUseHeadlessBrowser()
const grepInvert = isCI ? /@utility/ : undefined
const reporter = isCI
  ? [['github'], ['html', { outputFolder: 'playwright-report/lighthouse', open: 'never' }]]
  : [['list'], ['html', { outputFolder: 'playwright-report/lighthouse', open: 'never' }]]

const lighthouseProjects = [
  {
    environmentProjectName: 'AP Chromium',
    name: 'AP Lighthouse',
    testMatch: ['ap/**/*.spec.ts'],
  },
  {
    environmentProjectName: 'MP Staging Chromium',
    name: 'MP Lighthouse',
    testMatch: ['mp/**/*.spec.ts'],
  },
] as const

function getEnvironment(projectName: string) {
  const environment = testEnvironments.find((candidate) => candidate.projectName === projectName)

  if (!environment) {
    throw new Error(`Could not find a test environment named "${projectName}" for the Lighthouse suite.`)
  }

  return environment
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
  grepInvert,
  reporter,
  use: {
    headless,
    viewport,
    screen: viewport,
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: lighthouseProjects.map((project) => ({
    name: project.name,
    testMatch: project.testMatch,
    use: {
      ...devices['Desktop Chrome'],
      baseURL: getBaseURL(getEnvironment(project.environmentProjectName)),
      viewport,
      screen: viewport,
    },
  })),
  outputDir: 'test-results/lighthouse',
}

export default config
