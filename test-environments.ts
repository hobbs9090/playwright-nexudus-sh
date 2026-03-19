import { requireEnvVar } from './helpers'
import { getConfiguredBaseURL } from './nexudus-config'

export type TestEnvironment = {
  baseUrlEnvVar: string
  emailEnvVar: string
  passwordEnvVar: string
  projectName: string
  testMatch: string[]
}

export const testEnvironments: TestEnvironment[] = [
  {
    projectName: 'AP Chromium',
    baseUrlEnvVar: 'NEXUDUS_AP_BASE_URL',
    emailEnvVar: 'NEXUDUS_AP_EMAIL',
    passwordEnvVar: 'NEXUDUS_AP_PASSWORD',
    testMatch: ['tests/ap/**/*.spec.ts'],
  },
  {
    projectName: 'MP Staging Chromium',
    baseUrlEnvVar: 'NEXUDUS_MP_BASE_URL',
    emailEnvVar: 'NEXUDUS_MP_EMAIL',
    passwordEnvVar: 'NEXUDUS_MP_PASSWORD',
    testMatch: ['tests/mp/**/*.spec.ts'],
  },
  {
    projectName: 'API',
    baseUrlEnvVar: 'NEXUDUS_API_BASE_URL',
    emailEnvVar: 'NEXUDUS_MP_EMAIL',
    passwordEnvVar: 'NEXUDUS_MP_PASSWORD',
    testMatch: ['tests/api/**/*.spec.ts'],
  },
]

export function getBaseURL(environment: TestEnvironment) {
  return getConfiguredBaseURL(environment.baseUrlEnvVar)
}

export function getRequiredCredentialEnvVars() {
  return [...new Set(testEnvironments.flatMap((environment) => [environment.emailEnvVar, environment.passwordEnvVar]))]
}

export function getCredentials(emailEnvVar: string, passwordEnvVar: string) {
  return {
    email: requireEnvVar(emailEnvVar),
    password: requireEnvVar(passwordEnvVar),
  }
}

export function getConfiguredMemberName(memberEnvVar: string) {
  return requireEnvVar(memberEnvVar)
}
