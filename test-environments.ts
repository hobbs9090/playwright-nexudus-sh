import { requireEnvVar } from './helpers'
import { getConfiguredBaseURL } from './nexudus-config'
export type { ConfiguredLocationSelector } from './location-selectors'
export {
  commonLocationSelectorLabels,
  configuredLocationSelectorEnvVars,
  defaultLocationSelectorLabels,
  getConfiguredLocationSelectorLabel,
} from './location-selectors'

export type TestEnvironment = {
  baseUrlEnvVar: string
  emailEnvVar: string
  passwordEnvVar: string
  projectName: string
  testMatch: string[]
}

export type ConfiguredUserRole = 'admin' | 'member' | 'contact'

type RoleCredentialConfig = {
  emailEnvVar: string
  fallbackEmailEnvVar?: string
  fallbackPasswordEnvVar?: string
  passwordEnvVar: string
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

export const configuredUserCredentialEnvVars: Record<ConfiguredUserRole, RoleCredentialConfig> = {
  admin: {
    emailEnvVar: 'NEXUDUS_ADMIN_EMAIL',
    fallbackEmailEnvVar: 'NEXUDUS_AP_EMAIL',
    fallbackPasswordEnvVar: 'NEXUDUS_AP_PASSWORD',
    passwordEnvVar: 'NEXUDUS_ADMIN_PASSWORD',
  },
  member: {
    emailEnvVar: 'NEXUDUS_MEMBER_EMAIL',
    fallbackEmailEnvVar: 'NEXUDUS_MP_EMAIL',
    fallbackPasswordEnvVar: 'NEXUDUS_MP_PASSWORD',
    passwordEnvVar: 'NEXUDUS_MEMBER_PASSWORD',
  },
  contact: {
    emailEnvVar: 'NEXUDUS_CONTACT_EMAIL',
    passwordEnvVar: 'NEXUDUS_CONTACT_PASSWORD',
  },
}

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

function getCredentialValue(primaryEnvVar: string, fallbackEnvVar?: string) {
  const primaryValue = process.env[primaryEnvVar]?.trim()

  if (primaryValue) {
    return primaryValue
  }

  if (fallbackEnvVar) {
    return requireEnvVar(fallbackEnvVar)
  }

  return requireEnvVar(primaryEnvVar)
}

export function getConfiguredUserCredentials(role: ConfiguredUserRole) {
  const credentialConfig = configuredUserCredentialEnvVars[role]

  return {
    email: getCredentialValue(credentialConfig.emailEnvVar, credentialConfig.fallbackEmailEnvVar),
    password: getCredentialValue(credentialConfig.passwordEnvVar, credentialConfig.fallbackPasswordEnvVar),
  }
}

export function getConfiguredMemberName(memberEnvVar: string) {
  return requireEnvVar(memberEnvVar)
}
