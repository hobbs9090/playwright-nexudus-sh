import { test as base } from 'playwright-bdd'
import type { MPBookableResource, MPBookingSelection } from '../../../page-objects/mp/MPBookingsPage'
import type { NexudusBackofficeBookingResponse } from '../../support/backoffice-api'
import type { MPBookingWindow, MPRepeatPattern } from '../../support/mp-bookings'
import type { BookingUtilityMode, MPBookingUtilityAction } from './booking-utility'
import type { ResolvedMemberCredentials } from './member-resolver'

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

export const test = base.extend<{ bookingScenario: BookingScenarioState }>({
  bookingScenario: async ({}, use) => {
    await use(createBookingScenarioState())
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
