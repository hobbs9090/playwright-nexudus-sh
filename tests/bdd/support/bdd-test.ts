import { test as base } from 'playwright-bdd'
import type { MPBookableResource, MPBookingSelection } from '../../../page-objects/mp/MPBookingsPage'
import type { MPBookingWindow, MPRepeatPattern } from '../../support/mp-bookings'
import type { ResolvedMemberCredentials } from './member-resolver'

export type BookingScenarioState = {
  accessToken: string
  actualBookingWindow: MPBookingWindow | null
  actualSelection: MPBookingSelection | null
  activityBookingIdsBefore: number[]
  allowAlternative: boolean
  createdBookingIds: number[]
  createdBookingLinks: Array<{ href: string; id: number; text: string }>
  currentMemberId: number | null
  currentMemberName: string
  purchaseCompleted: boolean
  repeatPattern: MPRepeatPattern | null
  requestedBookingWindow: MPBookingWindow | null
  requestedMember: ResolvedMemberCredentials | null
  resource: MPBookableResource | null
  resourceName: string
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
    createdBookingIds: [],
    createdBookingLinks: [],
    currentMemberId: null,
    currentMemberName: '',
    purchaseCompleted: false,
    repeatPattern: null,
    requestedBookingWindow: null,
    requestedMember: null,
    resource: null,
    resourceName: '',
    usedAlternative: false,
  }
}
