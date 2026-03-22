import { expect, test } from '@playwright/test'
import { NexudusApiClient } from '../../api/NexudusApiClient'
import { MPBookingsPage, type MPActivityBookingRecord, type MPBookableResource } from '../../page-objects/mp/MPBookingsPage'
import { MPLoginPage } from '../../page-objects/mp/MPLoginPage'
import { MPPortalPage } from '../../page-objects/mp/MPPortalPage'
import { getFutureMpBookingWindow, type MPBookingWindow } from '../support/mp-bookings'
import { cancelPortalBooking } from '../support/mp-bookings-api'

const defaultTargetMeetingRoomName = 'Large Meeting Room #1'
const targetMeetingRoomName = process.env.NEXUDUS_MP_BOOKING_RESOURCE_NAME?.trim() || defaultTargetMeetingRoomName
const bookingWindowSearchDays = 7
const hasDedicatedMemberCredentials =
  Boolean(process.env.NEXUDUS_MEMBER_EMAIL?.trim()) && Boolean(process.env.NEXUDUS_MEMBER_PASSWORD?.trim())

test.describe('MP bookings', () => {
  let accessToken: string
  let bookingsPage: MPBookingsPage
  let currentMemberId: number
  let loginPage: MPLoginPage
  let portalPage: MPPortalPage

  test.beforeEach(async ({ page, request }) => {
    test.skip(
      process.env.CI === 'true' && !hasDedicatedMemberCredentials,
      'MP bookings require a dedicated non-admin member account in NEXUDUS_MEMBER_EMAIL and NEXUDUS_MEMBER_PASSWORD when running in CI.',
    )

    bookingsPage = new MPBookingsPage(page)
    loginPage = new MPLoginPage(page)
    portalPage = new MPPortalPage(page)

    const nexudusApi = new NexudusApiClient(request)
    const token = await nexudusApi.createBearerToken()
    const currentUser = await nexudusApi.getCurrentUser(token.access_token)

    accessToken = token.access_token
    currentMemberId = Number(currentUser.Id)
    expect(Number.isInteger(currentMemberId) && currentMemberId > 0, 'Expected the current MP API user to expose a numeric member id.').toBeTruthy()
  })

  test(`member can create a one-off 2-hour booking for ${targetMeetingRoomName} and clean it up by API @dg`, async ({ page, request }) => {
    test.slow()

    let bookingWindow: MPBookingWindow | null = null
    let createdBooking: MPActivityBookingRecord | null = null
    let purchaseCompleted = false
    let selectedResource: MPBookableResource | null = null

    try {
      await portalPage.installBlockingDialogSuppression()
      await loginPage.login()
      await loginPage.assertDashboardVisible()
      await portalPage.dismissOnboardingModalIfPresent()
      await portalPage.clickSidebarItem('Bookings')
      await bookingsPage.assertLoaded()

      const businessTimeZone = await bookingsPage.getBusinessTimeZone()

      for (let dayOffset = 0; dayOffset < bookingWindowSearchDays; dayOffset += 1) {
        const candidateBookingWindow = getFutureMpBookingWindow(businessTimeZone, dayOffset)

        selectedResource = await bookingsPage.openBookingEditorForResource(targetMeetingRoomName, candidateBookingWindow)

        if (!(await bookingsPage.isCurrentBookingWindowBookable())) {
          continue
        }

        bookingWindow = candidateBookingWindow
        break
      }

      expect(
        bookingWindow,
        `Expected ${targetMeetingRoomName} to expose a non-repeating 9:00 AM to 11:00 AM booking slot within the next ${bookingWindowSearchDays} candidate business dates.`,
      ).toBeTruthy()

      await bookingsPage.assertBookingEditorLoaded(targetMeetingRoomName, bookingWindow!)
      const continuePath = await bookingsPage.continueCurrentBooking()

      if (continuePath === '/basket') {
        await bookingsPage.assertBasketContainsBooking(targetMeetingRoomName)
        await bookingsPage.checkoutCurrentBasket()
      }

      await bookingsPage.assertCheckoutReady()
      await bookingsPage.completePurchase()
      await bookingsPage.assertPurchaseComplete()

      purchaseCompleted = true
      createdBooking = await bookingsPage.findActivityBooking({
        bookingWindow: bookingWindow!,
        coworkerId: currentMemberId,
        resourceId: selectedResource.id,
        resourceName: targetMeetingRoomName,
      })
    } finally {
      if (bookingWindow && selectedResource && (createdBooking || purchaseCompleted)) {
        const bookingToCleanup =
          createdBooking ||
          (await bookingsPage.findActivityBooking({
            bookingWindow,
            coworkerId: currentMemberId,
            resourceId: selectedResource.id,
            resourceName: targetMeetingRoomName,
          }))

        await cancelPortalBooking(request, accessToken, bookingToCleanup.Id)
        await bookingsPage.assertActivityBookingCancelledOrRemoved(bookingToCleanup.Id)
      }
    }
  })
})
