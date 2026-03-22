import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import {
  createBackofficeApiClientWithAPLogin,
  type NexudusBackofficeApiClient,
  type NexudusBackofficeAuthResponse,
  type NexudusBackofficeResourceMutationInput,
  type NexudusBackofficeResourceResponse,
  type NexudusBackofficeResourceTypeResponse,
} from '../../support/backoffice-api'
import { test, type ResourceSeedScenarioState } from '../support/bdd-test'
import {
  buildResourceSeedNames,
  createResourceSeedScenarioKey,
  trackSeededResources,
  readResourceSeedRecord,
  writeResourceSeedRecord,
  type ResourceSeedUtilityRequest,
} from '../support/resource-seed-utility'

type ResourceAmenityFlags = {
  AirConditioning: boolean
  ConferencePhone: boolean
  FlipChart: boolean
  Internet: boolean
  LargeDisplay: boolean
  NaturalLight: boolean
  Projector: boolean
  VideoConferencing: boolean
  WhiteBoard: boolean
}

type ParsedResourceSeedRequest = {
  allocation: number
  allowMultipleBookings: boolean
  amenities: ResourceAmenityFlags
  base: string
  business: string
  count: number
  hideInCalendar: boolean
  maxBookingLength: number | null
  minBookingLength: number | null
  onlyForMembers: boolean
  requiresConfirmation: boolean
  resourceType: string
  seed: boolean
  theme: string
  visible: boolean
}

const defaultResourceSeedRequest: ResourceSeedUtilityRequest = {
  allocation: '',
  allowMultipleBookings: 'false',
  amenities: '',
  base: '',
  business: '',
  count: '1',
  hideInCalendar: 'false',
  maxBookingLength: '',
  minBookingLength: '',
  onlyForMembers: 'false',
  requiresConfirmation: 'false',
  resourceType: '',
  seed: 'false',
  theme: '',
  visible: 'true',
}

const amenityKeyByNormalizedName = {
  airconditioning: 'AirConditioning',
  conferencephone: 'ConferencePhone',
  flipchart: 'FlipChart',
  internet: 'Internet',
  largedisplay: 'LargeDisplay',
  naturallight: 'NaturalLight',
  projector: 'Projector',
  videoconferencing: 'VideoConferencing',
  whiteboard: 'WhiteBoard',
} as const satisfies Record<string, keyof ResourceAmenityFlags>

const { Given, Then, When } = createBdd(test)

Given('the resource seed utility configuration is ready', async () => {
  test.slow()
  test.skip(process.env.CI === 'true', 'Resource seed utility scenarios are intended for manual utility runs, not CI.')
})

When('they prepare a resource seed utility request', async ({ resourceSeedScenario }) => {
  resourceSeedScenario.request = {
    ...defaultResourceSeedRequest,
  }
})

When('resource seed business is {string}', async ({ resourceSeedScenario }, business: string) => {
  updateResourceSeedRequest(resourceSeedScenario, { business })
})

When('resource seed resource type is {string}', async ({ resourceSeedScenario }, resourceType: string) => {
  updateResourceSeedRequest(resourceSeedScenario, { resourceType })
})

When('resource seed count is {string}', async ({ resourceSeedScenario }, count: string) => {
  updateResourceSeedRequest(resourceSeedScenario, { count })
})

When('resource seed theme is {string}', async ({ resourceSeedScenario }, theme: string) => {
  updateResourceSeedRequest(resourceSeedScenario, { theme })
})

When('resource seed base is {string}', async ({ resourceSeedScenario }, base: string) => {
  updateResourceSeedRequest(resourceSeedScenario, { base })
})

When('resource seed uses preferred seed is {string}', async ({ resourceSeedScenario }, seed: string) => {
  updateResourceSeedRequest(resourceSeedScenario, { seed })
})

When('resource seed visible is {string}', async ({ resourceSeedScenario }, visible: string) => {
  updateResourceSeedRequest(resourceSeedScenario, { visible })
})

When('resource seed requires confirmation is {string}', async ({ resourceSeedScenario }, requiresConfirmation: string) => {
  updateResourceSeedRequest(resourceSeedScenario, { requiresConfirmation })
})

When('resource seed allocation is {string}', async ({ resourceSeedScenario }, allocation: string) => {
  updateResourceSeedRequest(resourceSeedScenario, { allocation })
})

When('resource seed minimum booking length is {string}', async ({ resourceSeedScenario }, minBookingLength: string) => {
  updateResourceSeedRequest(resourceSeedScenario, { minBookingLength })
})

When('resource seed maximum booking length is {string}', async ({ resourceSeedScenario }, maxBookingLength: string) => {
  updateResourceSeedRequest(resourceSeedScenario, { maxBookingLength })
})

When('resource seed allow multiple bookings is {string}', async ({ resourceSeedScenario }, allowMultipleBookings: string) => {
  updateResourceSeedRequest(resourceSeedScenario, { allowMultipleBookings })
})

When('resource seed hide in calendar is {string}', async ({ resourceSeedScenario }, hideInCalendar: string) => {
  updateResourceSeedRequest(resourceSeedScenario, { hideInCalendar })
})

When('resource seed only for members is {string}', async ({ resourceSeedScenario }, onlyForMembers: string) => {
  updateResourceSeedRequest(resourceSeedScenario, { onlyForMembers })
})

When('resource seed amenities are {string}', async ({ resourceSeedScenario }, amenities: string) => {
  updateResourceSeedRequest(resourceSeedScenario, { amenities })
})

When('they run the resource seed utility', async ({ page, resourceSeedScenario }) => {
  const request = readPreparedResourceSeedRequest(resourceSeedScenario)
  const parsedRequest = parseResourceSeedRequest(request)

  const backofficeApi = await createBackofficeApiClientWithAPLogin(page)

  try {
    const authenticatedApUser = await backofficeApi.getAuthenticatedUser()
    const resolvedBusiness = await resolveResourceSeedBusiness(backofficeApi, authenticatedApUser, parsedRequest.business)
    const resolvedResourceType = await backofficeApi.findResourceTypeByName(parsedRequest.resourceType, resolvedBusiness.id)

    resourceSeedScenario.resolvedBusinessId = resolvedBusiness.id
    resourceSeedScenario.resolvedBusinessName = resolvedBusiness.name
    resourceSeedScenario.resolvedResourceType = resolvedResourceType

    await runAddResourceSeedUtility({
      backofficeApi,
      parsedRequest,
      request,
      resourceSeedScenario,
      resolvedBusiness,
      resolvedResourceType,
    })
  } finally {
    await backofficeApi.dispose()
  }
})

Then('the resource seed utility should finish successfully', async ({ resourceSeedScenario }) => {
  const request = readPreparedResourceSeedRequest(resourceSeedScenario)
  const scenarioKey = createResourceSeedScenarioKey(request)

  expect(resourceSeedScenario.resolvedBusinessId, 'Expected the resource seed utility to resolve a business id.').toBeTruthy()
  expect(resourceSeedScenario.resolvedResourceType, 'Expected the resource seed utility to resolve a resource type.').toBeTruthy()
  expect(
    resourceSeedScenario.createdResources.length,
    'Expected the seed utility to create one resource for each requested count item.',
  ).toBe(parseResourceSeedRequest(request).count)
  expect(resourceSeedScenario.plannedResourceNames).toEqual(resourceSeedScenario.createdResources.map((resource) => resource.Name))
  expect(resourceSeedScenario.createdResources.every((resource) => resource.BusinessId === resourceSeedScenario.resolvedBusinessId)).toBe(true)
  expect(
    resourceSeedScenario.createdResources.every((resource) => resource.ResourceTypeId === resourceSeedScenario.resolvedResourceType!.Id),
  ).toBe(true)
  await expect.poll(() => readResourceSeedRecord(scenarioKey)).not.toBeNull()
})

async function runAddResourceSeedUtility({
  backofficeApi,
  parsedRequest,
  request,
  resourceSeedScenario,
  resolvedBusiness,
  resolvedResourceType,
}: {
  backofficeApi: NexudusBackofficeApiClient
  parsedRequest: ParsedResourceSeedRequest
  request: ResourceSeedUtilityRequest
  resourceSeedScenario: ResourceSeedScenarioState
  resolvedBusiness: { id: number; name: string }
  resolvedResourceType: NexudusBackofficeResourceTypeResponse
}) {
  const resourceNames = await buildResourceSeedNames({
    base: parsedRequest.base,
    count: parsedRequest.count,
    resourceTypeName: resolvedResourceType.Name,
    seed: parsedRequest.seed,
    theme: parsedRequest.theme,
  })

  resourceSeedScenario.fallbackThemeNameCount = resourceNames.fallbackCount
  resourceSeedScenario.plannedResourceNames = resourceNames.names
  resourceSeedScenario.seedStem = resourceNames.seedStem
  resourceSeedScenario.themedNames = resourceNames.themedNames

  const collidingResources = await findResourcesByExactNames(backofficeApi, {
    businessId: resolvedBusiness.id,
    names: resourceNames.names,
    resourceTypeId: resolvedResourceType.Id,
  })

  expect(
    collidingResources.length,
    `Expected the generated resource names to be unused before add mode creates them. Existing matches: ${collidingResources
      .map((resource) => resource.Name)
      .join(', ')}`,
  ).toBe(0)

  resourceSeedScenario.createdResources = []

  try {
    for (const [index, resourceName] of resourceNames.names.entries()) {
      const createdResource = await backofficeApi.createResource(
        buildBackofficeResourcePayload({
          businessId: resolvedBusiness.id,
          name: resourceName,
          parsedRequest,
          resourceType: resolvedResourceType,
          sequenceNumber: index + 1,
        }),
      )

      resourceSeedScenario.createdResources.push(createdResource)
    }
  } catch (error) {
    for (const createdResource of resourceSeedScenario.createdResources) {
      await backofficeApi.deleteResource(createdResource.Id).catch(() => {})
    }

    throw error
  }

  await writeResourceSeedRecord({
    businessId: resolvedBusiness.id,
    businessName: resolvedBusiness.name,
    createdAtISO: new Date().toISOString(),
    generatedNames: resourceSeedScenario.plannedResourceNames,
    request,
    resourceIds: resourceSeedScenario.createdResources.map((resource) => resource.Id),
    resourceTypeId: resolvedResourceType.Id,
    resourceTypeName: resolvedResourceType.Name,
    scenarioKey: createResourceSeedScenarioKey(request),
    seedStem: resourceSeedScenario.seedStem,
  })

  await trackSeededResources(
    resourceSeedScenario.createdResources.map((resource) => ({
      businessId: resolvedBusiness.id,
      businessName: resolvedBusiness.name,
      createdAtISO: new Date().toISOString(),
      name: resource.Name,
      resourceId: resource.Id,
      resourceTypeId: resolvedResourceType.Id,
      resourceTypeName: resolvedResourceType.Name,
      scenarioKey: createResourceSeedScenarioKey(request),
    })),
  )
}

function buildBackofficeResourcePayload({
  businessId,
  name,
  parsedRequest,
  resourceType,
  sequenceNumber,
}: {
  businessId: number
  name: string
  parsedRequest: ParsedResourceSeedRequest
  resourceType: NexudusBackofficeResourceTypeResponse
  sequenceNumber: number
}): NexudusBackofficeResourceMutationInput {
  return {
    Allocation: parsedRequest.allocation,
    AllowMultipleBookings: parsedRequest.allowMultipleBookings,
    Archived: false,
    BusinessId: businessId,
    ConferencePhone: parsedRequest.amenities.ConferencePhone,
    Description: buildSeededResourceDescription(parsedRequest, resourceType.Name),
    DisplayOrder: 9000 + sequenceNumber,
    FlipChart: parsedRequest.amenities.FlipChart,
    GroupName: sanitizeResourceGroupName(parsedRequest.base || resourceType.Name),
    HideInCalendar: parsedRequest.hideInCalendar,
    Internet: parsedRequest.amenities.Internet,
    LargeDisplay: parsedRequest.amenities.LargeDisplay,
    MaxBookingLength: parsedRequest.maxBookingLength,
    MinBookingLength: parsedRequest.minBookingLength,
    Name: name,
    NaturalLight: parsedRequest.amenities.NaturalLight,
    OnlyForMembers: parsedRequest.onlyForMembers,
    Projector: parsedRequest.amenities.Projector,
    RequiresConfirmation: parsedRequest.requiresConfirmation,
    ResourceTypeId: resourceType.Id,
    ResourceTypeName: resourceType.Name,
    VideoConferencing: parsedRequest.amenities.VideoConferencing,
    Visible: parsedRequest.visible,
    WhiteBoard: parsedRequest.amenities.WhiteBoard,
    AirConditioning: parsedRequest.amenities.AirConditioning,
  }
}

function buildSeededResourceDescription(parsedRequest: ParsedResourceSeedRequest, resourceTypeName: string) {
  const descriptionParts = [
    'Created by the Playwright BDD meeting-room seed utility.',
    `Resource type: ${resourceTypeName}.`,
    `Seed enabled: ${parsedRequest.seed}.`,
  ]

  if (parsedRequest.theme) {
    descriptionParts.push(`Theme: ${parsedRequest.theme}.`)
  }

  if (parsedRequest.base) {
    descriptionParts.push(`Base: ${parsedRequest.base}.`)
  }

  return descriptionParts.join(' ')
}

async function resolveResourceSeedBusiness(
  backofficeApi: NexudusBackofficeApiClient,
  authenticatedApUser: NexudusBackofficeAuthResponse,
  requestedBusiness: string,
) {
  const normalizedRequestedBusiness = normalizeSeedValue(requestedBusiness)
  const defaultBusinessId = Number(authenticatedApUser.DefaultBusinessId)
  const defaultBusinessName = String(authenticatedApUser.DefaultBusinessName || '').trim()

  expect(
    Number.isInteger(defaultBusinessId) && defaultBusinessId > 0,
    'Expected the authenticated AP user to expose a numeric default business id.',
  ).toBeTruthy()
  expect(defaultBusinessName, 'Expected the authenticated AP user to expose a default business name.').toBeTruthy()

  if (!normalizedRequestedBusiness || normalizeSeedValue(defaultBusinessName) === normalizedRequestedBusiness) {
    return {
      id: defaultBusinessId,
      name: defaultBusinessName,
    }
  }

  const accessibleBusinessIds = Array.from(
    new Set(
      (authenticatedApUser.Businesses || [])
        .map((businessId) => Number(businessId))
        .filter((businessId) => Number.isInteger(businessId) && businessId > 0)
        .concat(defaultBusinessId),
    ),
  )
  const accessibleBusinesses = await Promise.all(accessibleBusinessIds.map((businessId) => backofficeApi.getBusiness(businessId)))
  const matchingBusiness = accessibleBusinesses.find(
    (business) => normalizeSeedValue(String(business.Name || '')) === normalizedRequestedBusiness,
  )

  expect(
    matchingBusiness?.Id,
    `Expected the authenticated AP user to have access to business "${requestedBusiness}".`,
  ).toBeTruthy()

  return {
    id: matchingBusiness!.Id,
    name: String(matchingBusiness!.Name || '').trim(),
  }
}

async function findResourcesByExactNames(
  backofficeApi: NexudusBackofficeApiClient,
  {
    businessId,
    names,
    resourceTypeId,
  }: {
    businessId: number
    names: string[]
    resourceTypeId: number
  },
) {
  const resources = await backofficeApi.listResources()
  const resourceByNormalizedName = new Map(
    resources
      .filter(
        (resource) =>
          resource.BusinessId === businessId &&
          resource.ResourceTypeId === resourceTypeId &&
          names.some((name) => normalizeSeedValue(name) === normalizeSeedValue(resource.Name)),
      )
      .map((resource) => [normalizeSeedValue(resource.Name), resource] as const),
  )

  return names.map((name) => resourceByNormalizedName.get(normalizeSeedValue(name))).filter(Boolean) as NexudusBackofficeResourceResponse[]
}

function parseResourceSeedRequest(request: ResourceSeedUtilityRequest): ParsedResourceSeedRequest {
  const count = parseRequiredPositiveInteger(request.count, 'Count')
  const resourceType = request.resourceType.trim()
  const minBookingLength = parseOptionalDurationMinutes(request.minBookingLength, 'Min booking length')
  const maxBookingLength = parseOptionalDurationMinutes(request.maxBookingLength, 'Max booking length')
  const seed = parseBooleanInput(request.seed, 'Seed', false)

  expect(resourceType, 'Expected the resource seed utility row to include a resource type name.').toBeTruthy()

  if (minBookingLength !== null && maxBookingLength !== null) {
    expect(
      maxBookingLength >= minBookingLength,
      `Expected Max booking length (${maxBookingLength}) to be greater than or equal to Min booking length (${minBookingLength}).`,
    ).toBeTruthy()
  }

  return {
    allocation: parseOptionalPositiveInteger(request.allocation, 'Allocation') ?? 1,
    allowMultipleBookings: parseBooleanInput(request.allowMultipleBookings, 'Allow multiple bookings', false),
    amenities: parseAmenityFlags(request.amenities),
    base: request.base.trim(),
    business: request.business.trim(),
    count,
    hideInCalendar: parseBooleanInput(request.hideInCalendar, 'Hide in calendar', false),
    maxBookingLength,
    minBookingLength,
    onlyForMembers: parseBooleanInput(request.onlyForMembers, 'Only for members', false),
    requiresConfirmation: parseBooleanInput(request.requiresConfirmation, 'Requires confirmation', false),
    resourceType,
    seed,
    theme: request.theme.trim(),
    visible: parseBooleanInput(request.visible, 'Visible', true),
  }
}

function parseBooleanInput(rawValue: string, fieldLabel: string, defaultValue: boolean) {
  const normalizedValue = rawValue.trim().toLowerCase()

  if (!normalizedValue) {
    return defaultValue
  }

  if (['true', 'yes', '1', 'y'].includes(normalizedValue)) {
    return true
  }

  if (['false', 'no', '0', 'n'].includes(normalizedValue)) {
    return false
  }

  throw new Error(`Unsupported ${fieldLabel} value "${rawValue}". Use true/false or yes/no.`)
}

function parseRequiredPositiveInteger(rawValue: string, fieldLabel: string) {
  const resolvedValue = parseOptionalPositiveInteger(rawValue, fieldLabel)

  if (resolvedValue === null) {
    throw new Error(`${fieldLabel} is required.`)
  }

  return resolvedValue
}

function parseOptionalPositiveInteger(rawValue: string, fieldLabel: string) {
  const normalizedValue = rawValue.trim()

  if (!normalizedValue) {
    return null
  }

  expect(/^\d+$/.test(normalizedValue), `Expected ${fieldLabel} to be a positive integer, but received "${rawValue}".`).toBeTruthy()

  const parsedValue = Number(normalizedValue)

  expect(parsedValue > 0, `Expected ${fieldLabel} to be greater than zero, but received "${rawValue}".`).toBeTruthy()

  return parsedValue
}

function parseOptionalDurationMinutes(rawValue: string, fieldLabel: string) {
  const normalizedValue = rawValue.trim().toLowerCase()

  if (!normalizedValue) {
    return null
  }

  if (/^\d+$/.test(normalizedValue)) {
    return Number(normalizedValue)
  }

  const minuteMatch = normalizedValue.match(/^(\d+)\s*(minute|minutes|min|mins)$/)

  if (minuteMatch) {
    return Number(minuteMatch[1])
  }

  const hourMatch = normalizedValue.match(/^(\d+)\s*(hour|hours|hr|hrs)$/)

  if (hourMatch) {
    return Number(hourMatch[1]) * 60
  }

  throw new Error(`Unsupported ${fieldLabel} value "${rawValue}". Use minutes as an integer or values like "30 minutes" or "2 hours".`)
}

function parseAmenityFlags(rawAmenities: string): ResourceAmenityFlags {
  const flags: ResourceAmenityFlags = {
    AirConditioning: false,
    ConferencePhone: false,
    FlipChart: false,
    Internet: false,
    LargeDisplay: false,
    NaturalLight: false,
    Projector: false,
    VideoConferencing: false,
    WhiteBoard: false,
  }

  const normalizedAmenities = rawAmenities
    .split(',')
    .map((amenity) => amenity.replace(/[^a-z0-9]+/gi, '').toLowerCase())
    .filter(Boolean)

  for (const amenity of normalizedAmenities) {
    const amenityKey = amenityKeyByNormalizedName[amenity as keyof typeof amenityKeyByNormalizedName]

    if (!amenityKey) {
      throw new Error(
        `Unsupported Amenities value "${amenity}". Supported values are ${Object.keys(amenityKeyByNormalizedName)
          .sort((leftAmenity, rightAmenity) => leftAmenity.localeCompare(rightAmenity))
          .join(', ')}.`,
      )
    }

    flags[amenityKey] = true
  }

  return flags
}

function sanitizeResourceGroupName(rawGroupName: string) {
  const sanitizedGroupName = rawGroupName.replace(/#/g, '').replace(/\s+/g, ' ').trim()

  return sanitizedGroupName || 'Meeting Rooms'
}

function normalizeSeedValue(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function readPreparedResourceSeedRequest(resourceSeedScenario: ResourceSeedScenarioState) {
  expect(resourceSeedScenario.request, 'Expected the resource seed utility request to be prepared before running the utility.').toBeTruthy()
  return resourceSeedScenario.request!
}

function updateResourceSeedRequest(
  resourceSeedScenario: ResourceSeedScenarioState,
  patch: Partial<ResourceSeedUtilityRequest>,
) {
  resourceSeedScenario.request = {
    ...readPreparedResourceSeedRequest(resourceSeedScenario),
    ...patch,
  }
}
