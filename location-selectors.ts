import {
  defaultSharedStagingLocation,
  sharedStagingLocationLabels,
  type SharedStagingLocationLabel,
} from './shared-staging-locations'

export type ConfiguredLocationSelector = 'ap' | 'mp'

export const configuredLocationSelectorEnvVars: Record<ConfiguredLocationSelector, string> = {
  ap: 'NEXUDUS_AP_LOCATION_SELECTOR_LABEL',
  mp: 'NEXUDUS_MP_LOCATION_SELECTOR_LABEL',
}

export const commonLocationSelectorLabels = sharedStagingLocationLabels

export type CommonLocationSelectorLabel = SharedStagingLocationLabel

export const defaultLocationSelectorLabels: Record<ConfiguredLocationSelector, CommonLocationSelectorLabel> = {
  ap: defaultSharedStagingLocation.label,
  mp: defaultSharedStagingLocation.label,
}

export function getConfiguredLocationSelectorLabel(target: ConfiguredLocationSelector) {
  return process.env[configuredLocationSelectorEnvVars[target]]?.trim() || defaultLocationSelectorLabels[target]
}
