export type ConfiguredLocationSelector = 'ap' | 'mp'

export const configuredLocationSelectorEnvVars: Record<ConfiguredLocationSelector, string> = {
  ap: 'NEXUDUS_AP_LOCATION_SELECTOR_LABEL',
  mp: 'NEXUDUS_MP_LOCATION_SELECTOR_LABEL',
}

export const commonLocationSelectorLabels = [
  'Coworking Network (STEVEN)',
  'Coworking Central Street (STEVEN)',
  'Coworking Soho (STEVEN)',
] as const

export type CommonLocationSelectorLabel = (typeof commonLocationSelectorLabels)[number]

export const defaultLocationSelectorLabels: Record<ConfiguredLocationSelector, CommonLocationSelectorLabel> = {
  ap: commonLocationSelectorLabels[2],
  mp: commonLocationSelectorLabels[2],
}

export function getConfiguredLocationSelectorLabel(target: ConfiguredLocationSelector) {
  return process.env[configuredLocationSelectorEnvVars[target]]?.trim() || defaultLocationSelectorLabels[target]
}
