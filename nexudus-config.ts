export const nexudusBaseURLs = {
  ap: 'https://dashboard-staging.nexudus.com/',
  mp: 'https://coworkingnetworksteven.spacesstaging.nexudus.com/',
} as const

const defaultBaseURLsByEnvVar: Record<string, string> = {
  NEXUDUS_AP_BASE_URL: nexudusBaseURLs.ap,
  NEXUDUS_MP_BASE_URL: nexudusBaseURLs.mp,
  NEXUDUS_API_BASE_URL: nexudusBaseURLs.mp,
}

export function getConfiguredBaseURL(baseUrlEnvVar: string) {
  if (baseUrlEnvVar === 'NEXUDUS_API_BASE_URL') {
    return getConfiguredApiBaseURL()
  }

  return process.env[baseUrlEnvVar]?.trim() || defaultBaseURLsByEnvVar[baseUrlEnvVar] || ''
}

export function getConfiguredApiBaseURL() {
  const configuredBaseURL = process.env.NEXUDUS_API_BASE_URL?.trim()

  if (configuredBaseURL) {
    return getURLOrigin(configuredBaseURL)
  }

  return getURLOrigin(process.env.NEXUDUS_MP_BASE_URL?.trim() || defaultBaseURLsByEnvVar.NEXUDUS_MP_BASE_URL)
}

export function getURLOrigin(url: string) {
  try {
    return new URL(url).origin
  } catch {
    return url
  }
}
