import { defaultLocationSelectorLabels, getConfiguredLocationSelectorLabel } from './location-selectors'
import { sharedStagingMpBaseURLsByLocationLabel } from './shared-staging-locations'

export const nexudusBaseURLs = {
  ap: 'https://dashboard-staging.nexudus.com/',
  mp: 'https://coworkingsohosteven.spacesstaging.nexudus.com/',
} as const

export const nexudusMpBaseURLsByLocationLabel = sharedStagingMpBaseURLsByLocationLabel

const defaultBaseURLsByEnvVar: Record<string, string> = {
  NEXUDUS_AP_BASE_URL: nexudusBaseURLs.ap,
  NEXUDUS_MP_BASE_URL: nexudusMpBaseURLsByLocationLabel[defaultLocationSelectorLabels.mp],
  NEXUDUS_API_BASE_URL: nexudusMpBaseURLsByLocationLabel[defaultLocationSelectorLabels.mp],
}

export function getConfiguredBaseURL(baseUrlEnvVar: string) {
  if (baseUrlEnvVar === 'NEXUDUS_API_BASE_URL') {
    return getConfiguredApiBaseURL()
  }

  if (baseUrlEnvVar === 'NEXUDUS_MP_BASE_URL') {
    const configuredBaseURL = process.env.NEXUDUS_MP_BASE_URL?.trim()

    if (configuredBaseURL && !isKnownSharedMpBaseURL(configuredBaseURL)) {
      return configuredBaseURL
    }

    return getConfiguredMpBaseURL()
  }

  return process.env[baseUrlEnvVar]?.trim() || defaultBaseURLsByEnvVar[baseUrlEnvVar] || ''
}

export function getConfiguredApiBaseURL() {
  const configuredBaseURL = process.env.NEXUDUS_API_BASE_URL?.trim()

  if (configuredBaseURL) {
    return getURLOrigin(configuredBaseURL)
  }

  return getURLOrigin(getConfiguredBaseURL('NEXUDUS_MP_BASE_URL'))
}

export function getConfiguredMpBaseURL() {
  const configuredLocationLabel = getConfiguredLocationSelectorLabel('mp')

  return (
    nexudusMpBaseURLsByLocationLabel[configuredLocationLabel] ||
    process.env.NEXUDUS_MP_BASE_URL?.trim() ||
    defaultBaseURLsByEnvVar.NEXUDUS_MP_BASE_URL
  )
}

function isKnownSharedMpBaseURL(url: string) {
  const urlOrigin = getURLOrigin(url)

  return Object.values(nexudusMpBaseURLsByLocationLabel).some((knownBaseURL) => getURLOrigin(knownBaseURL) === urlOrigin)
}

export function getURLOrigin(url: string) {
  try {
    return new URL(url).origin
  } catch {
    return url
  }
}
