import { test as base } from 'playwright-bdd'
import type { MPBookableResource, MPBookingSelection } from '../../../page-objects/mp/MPBookingsPage'
import type {
  NexudusBackofficeBookingResponse,
  NexudusBackofficeResourceResponse,
  NexudusBackofficeResourceTypeResponse,
} from '../../support/backoffice-api'
import type { MPBookingWindow, MPRepeatPattern } from '../../support/mp-bookings'
import type { BookingUtilityMode, MPBookingUtilityAction } from './booking-utility'
import type { ResolvedMemberCredentials } from './member-resolver'
import type { ResourceSeedUtilityRequest } from './resource-seed-utility'

export type BookingUtilityRequest = {
  alternativePreference: string
  bookingDate: string
  bookingLength: string
  repeatOptions: string
  resourceName: string
  startTime: string
}

export type BookingScenarioState = {
  accessToken: string
  actualBookingWindow: MPBookingWindow | null
  actualSelection: MPBookingSelection | null
  activityBookingIdsBefore: number[]
  allowAlternative: boolean
  createdBackofficeBookings: NexudusBackofficeBookingResponse[]
  createdBookingIds: number[]
  createdBookingLinks: Array<{ href: string; id: number; text: string }>
  currentMemberId: number | null
  currentMemberName: string
  deletedBookingIds: number[]
  matchedBookingLinks: Array<{ href: string; id: number; text: string }>
  matchedBackofficeBookings: NexudusBackofficeBookingResponse[]
  purchaseCompleted: boolean
  repeatPattern: MPRepeatPattern | null
  requestedBookingWindow: MPBookingWindow | null
  requestedMember: ResolvedMemberCredentials | null
  requestedUtilityRequest: BookingUtilityRequest | null
  resource: MPBookableResource | null
  resourceName: string
  utilityAction: MPBookingUtilityAction | null
  utilityMode: BookingUtilityMode | null
  usedAlternative: boolean
}

export type ResourceSeedScenarioState = {
  createdResources: NexudusBackofficeResourceResponse[]
  fallbackThemeNameCount: number
  plannedResourceNames: string[]
  request: ResourceSeedUtilityRequest | null
  resolvedBusinessId: number | null
  resolvedBusinessName: string
  resolvedResourceType: NexudusBackofficeResourceTypeResponse | null
  seedStem: string | null
  themedNames: string[]
}

export const test = base.extend<{ bookingScenario: BookingScenarioState; resourceSeedScenario: ResourceSeedScenarioState }>({
  bookingScenario: async ({}, use) => {
    await use(createBookingScenarioState())
  },
  resourceSeedScenario: async ({}, use) => {
    await use(createResourceSeedScenarioState())
  },
})

function createBookingScenarioState(): BookingScenarioState {
  return {
    accessToken: '',
    actualBookingWindow: null,
    actualSelection: null,
    activityBookingIdsBefore: [],
    allowAlternative: false,
    createdBackofficeBookings: [],
    createdBookingIds: [],
    createdBookingLinks: [],
    currentMemberId: null,
    currentMemberName: '',
    deletedBookingIds: [],
    matchedBookingLinks: [],
    matchedBackofficeBookings: [],
    purchaseCompleted: false,
    repeatPattern: null,
    requestedBookingWindow: null,
    requestedMember: null,
    requestedUtilityRequest: null,
    resource: null,
    resourceName: '',
    utilityAction: null,
    utilityMode: null,
    usedAlternative: false,
  }
}

function createResourceSeedScenarioState(): ResourceSeedScenarioState {
  return {
    createdResources: [],
    fallbackThemeNameCount: 0,
    plannedResourceNames: [],
    request: null,
    resolvedBusinessId: null,
    resolvedBusinessName: '',
    resolvedResourceType: null,
    seedStem: null,
    themedNames: [],
  }
}
