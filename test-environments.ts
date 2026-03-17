import { requireEnvVar } from './helpers'

export type TestEnvironment = {
  baseUrlEnvVar: string
  credentialLabel: string
  defaultBaseURL: string
  emailEnvVar: string
  loginPath: string
  passwordEnvVar: string
  projectName: string
  successUrlPattern: RegExp
  testMatch?: string[]
  testIgnore?: string[]
}

export const testEnvironments: TestEnvironment[] = [
  {
    projectName: 'AP Chromium',
    credentialLabel: 'AP',
    baseUrlEnvVar: 'NEXUDUS_AP_BASE_URL',
    defaultBaseURL: 'https://dashboard.nexudus.com/',
    emailEnvVar: 'NEXUDUS_AP_EMAIL',
    loginPath: '',
    passwordEnvVar: 'NEXUDUS_AP_PASSWORD',
    successUrlPattern: /\/dashboards\/now(?:\?.*)?$/,
    testIgnore: ['tests/mp-login.spec.ts'],
  },
  {
    projectName: 'MP Staging Chromium',
    credentialLabel: 'MP staging',
    baseUrlEnvVar: 'NEXUDUS_MP_BASE_URL',
    defaultBaseURL: 'https://dashboard-staging.nexudus.com/',
    emailEnvVar: 'NEXUDUS_MP_EMAIL',
    loginPath: '/login',
    passwordEnvVar: 'NEXUDUS_MP_PASSWORD',
    successUrlPattern: /\/home(?:\?.*)?$/,
    testMatch: ['tests/mp-login.spec.ts'],
  },
]

export function getBaseURL(environment: TestEnvironment) {
  return process.env[environment.baseUrlEnvVar]?.trim() || environment.defaultBaseURL
}

export function getEnvironmentForProject(projectName: string) {
  return testEnvironments.find((candidate) => candidate.projectName === projectName) ?? testEnvironments[0]
}

export function getCredentialsForProject(projectName: string) {
  const environment = getEnvironmentForProject(projectName)

  return {
    email: requireEnvVar(environment.emailEnvVar),
    password: requireEnvVar(environment.passwordEnvVar),
  }
}

export function getRequiredCredentialEnvVars() {
  return testEnvironments.flatMap((environment) => [environment.emailEnvVar, environment.passwordEnvVar])
}
