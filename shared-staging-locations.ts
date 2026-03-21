export const sharedStagingLocations = {
  network: {
    label: 'Coworking Network (STEVEN)',
    mpBaseURL: 'https://coworkingnetworksteven.spacesstaging.nexudus.com/',
  },
  centralStreet: {
    label: 'Coworking Central Street (STEVEN)',
    mpBaseURL: 'https://coworkingcentralstreetsteven.spacesstaging.nexudus.com/',
  },
  soho: {
    label: 'Coworking Soho (STEVEN)',
    mpBaseURL: 'https://coworkingsohosteven.spacesstaging.nexudus.com/',
  },
} as const

export type SharedStagingLocationKey = keyof typeof sharedStagingLocations
export type SharedStagingLocation = (typeof sharedStagingLocations)[SharedStagingLocationKey]
export type SharedStagingLocationLabel = SharedStagingLocation['label']

export const sharedStagingLocationOptions = Object.values(sharedStagingLocations) as SharedStagingLocation[]
export const sharedStagingLocationLabels = sharedStagingLocationOptions.map(
  (sharedStagingLocation) => sharedStagingLocation.label,
) as SharedStagingLocationLabel[]
export const defaultSharedStagingLocation = sharedStagingLocations.soho

export const sharedStagingMpBaseURLsByLocationLabel = Object.fromEntries(
  sharedStagingLocationOptions.map((sharedStagingLocation) => [
    sharedStagingLocation.label,
    sharedStagingLocation.mpBaseURL,
  ]),
) as Record<SharedStagingLocationLabel, string>
