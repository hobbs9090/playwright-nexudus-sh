import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { NexudusApiClient } from '../../../api/NexudusApiClient'
import { MPBookingsPage, type MPBookableResource, type MPBookingSelection } from '../../../page-objects/mp/MPBookingsPage'
import { MPLoginPage } from '../../../page-objects/mp/MPLoginPage'
import { MPPortalPage } from '../../../page-objects/mp/MPPortalPage'
import {
  createMpBookingWindow,
  parseAlternativeBookingPreference,
  parseMpRepeatPattern,
  shiftMpBookingWindowByDays,
  type MPBookingWindow,
  type MPRepeatPattern,
} from '../../support/mp-bookings'
import { cancelPortalBooking } from '../../support/mp-bookings-api'
import { test, type BookingScenarioState } from '../support/bdd-test'
import { resolveMemberCredentialsByName, type ResolvedMemberCredentials } from '../support/member-resolver'

const alternativeFutureDaySearchWindow = 7
const hasDedicatedMemberCredentials =
  Boolean(process.env.NEXUDUS_MEMBER_EMAIL?.trim()) && Boolean(process.env.NEXUDUS_MEMBER_PASSWORD?.trim())
const { After, Given, Then, When } = createBdd(test)

After(async ({ bookingScenario, page, request }) => {
  if (!bookingScenario.accessToken) {
    return
  }

  const bookingsPage = new MPBookingsPage(page)
  const bookingIdsToCleanup = [...new Set(bookingScenario.createdBookingIds)]

  if (
    bookingIdsToCleanup.length === 0 &&
    bookingScenario.purchaseCompleted &&
    bookingScenario.resourceName
  ) {
    const fallbackBookingLinks = await bookingsPage
      .getNewActivityBookingLinks(bookingScenario.activityBookingIdsBefore, bookingScenario.resourceName)
      .catch(() => [])

    bookingIdsToCleanup.push(...fallbackBookingLinks.map((bookingLink) => bookingLink.id))
  }

  for (const bookingId of bookingIdsToCleanup) {
    await cancelPortalBooking(request, bookingScenario.accessToken, bookingId)
    await bookingsPage.assertActivityBookingCancelledOrRemoved(bookingId)
  }
})

Given('member {string} can access the member portal', async ({ bookingScenario, page, request }, memberName: string) => {
  test.slow()
  test.skip(
    process.env.CI === 'true' && !hasDedicatedMemberCredentials,
    'MP booking BDD scenarios require a dedicated non-admin member account in NEXUDUS_MEMBER_EMAIL and NEXUDUS_MEMBER_PASSWORD when running in CI.',
  )

  const loginPage = new MPLoginPage(page)
  const nexudusApi = new NexudusApiClient(request)
  const resolvedMember = await resolveMemberCredentialsByName(request, memberName)
  const memberToken = await nexudusApi.createBearerTokenForCredentials(resolvedMember.email, resolvedMember.password)
  const currentUser = await nexudusApi.getCurrentUser(memberToken.access_token)
  const currentMemberName = String(currentUser.FullName || '').trim() || resolvedMember.resolvedName
  const currentMemberId = Number(currentUser.Id)

  expect(Number.isInteger(currentMemberId) && currentMemberId > 0, 'Expected the booking BDD user profile to expose a numeric member id.').toBeTruthy()

  bookingScenario.accessToken = memberToken.access_token
  bookingScenario.currentMemberId = currentMemberId
  bookingScenario.currentMemberName = currentMemberName
  bookingScenario.requestedMember = resolvedMember

  await loginPage.login(resolvedMember.email, resolvedMember.password)
  await loginPage.assertDashboardVisible(currentMemberName)
})

When(
  'they create a booking for {string} on {string} at {string} for {string} with repeat {string} and alternative {string}',
  async (
    { bookingScenario, page },
    resourceName: string,
    bookingDate: string,
    startTime: string,
    bookingLength: string,
    repeatOptions: string,
    alternativePreference: string,
  ) => {
    const bookingsPage = new MPBookingsPage(page)
    const portalPage = new MPPortalPage(page)

    await portalPage.dismissOnboardingModalIfPresent()

    bookingScenario.activityBookingIdsBefore = await bookingsPage.captureRenderedActivityBookingIds()

    await page.goto('/bookings?tab=Resources&view=card', { waitUntil: 'domcontentloaded' })
    await bookingsPage.assertLoaded()

    const businessTimeZone = await bookingsPage.getBusinessTimeZone()
    const requestedBookingWindow = createMpBookingWindow({
      businessTimeZone,
      dateInput: bookingDate,
      lengthInput: bookingLength,
      startTimeInput: startTime,
    })
    const repeatPattern = parseMpRepeatPattern(repeatOptions, requestedBookingWindow)
    const allowAlternative = parseAlternativeBookingPreference(alternativePreference)

    bookingScenario.allowAlternative = allowAlternative
    bookingScenario.repeatPattern = repeatPattern
    bookingScenario.requestedBookingWindow = requestedBookingWindow
    bookingScenario.resourceName = resourceName

    const selectedResource = await bookingsPage.openBookingEditorForResource(resourceName, requestedBookingWindow)

    bookingScenario.resource = selectedResource

    await bookingsPage.assertBookingEditorLoaded(resourceName, requestedBookingWindow)

    const exactBookingWindowBookable = await bookingsPage.isCurrentBookingWindowBookable()
    let actualBookingWindow = requestedBookingWindow

    if (!exactBookingWindowBookable) {
      if (!allowAlternative) {
        throw new Error(
          `The requested slot for "${resourceName}" on ${requestedBookingWindow.dateISO} at ${requestedBookingWindow.startTimeLabel} is unavailable and alternative booking was disabled.`,
        )
      }

      const sameDayAlternativeSelection = await bookingsPage
        .selectNearestAvailableStartTime(
          requestedBookingWindow.startMinutesSinceMidnight,
          requestedBookingWindow.durationMinutes,
        )
        .catch(() => null)

      if (sameDayAlternativeSelection) {
        actualBookingWindow = createMpBookingWindow({
          businessTimeZone,
          dateInput: requestedBookingWindow.dateISO,
          lengthInput: requestedBookingWindow.durationLabel,
          startTimeInput: sameDayAlternativeSelection.startTimeLabel,
        })
      } else {
        let futureDayAlternativeWindow: MPBookingWindow | null = null

        for (let dayOffset = 1; dayOffset <= alternativeFutureDaySearchWindow; dayOffset += 1) {
          const candidateAlternativeWindow = shiftMpBookingWindowByDays(requestedBookingWindow, dayOffset)

          await bookingsPage.openBookingEditorForResource(resourceName, candidateAlternativeWindow)
          await bookingsPage.assertBookingEditorLoaded(resourceName, candidateAlternativeWindow)

          if (await bookingsPage.isCurrentBookingWindowBookable()) {
            futureDayAlternativeWindow = candidateAlternativeWindow
            break
          }
        }

        if (!futureDayAlternativeWindow) {
          throw new Error(
            `The requested slot for "${resourceName}" on ${requestedBookingWindow.dateISO} at ${requestedBookingWindow.startTimeLabel} was unavailable, and no acceptable alternative was found within ${alternativeFutureDaySearchWindow} future day(s).`,
          )
        }

        actualBookingWindow = futureDayAlternativeWindow
      }

      bookingScenario.usedAlternative = true
    }

    if (repeatPattern.uiOptionLabel !== 'Does not repeat') {
      await bookingsPage.selectRepeatOption(repeatPattern.uiOptionLabel)
      await bookingsPage.setRepeatUntil(repeatPattern.repeatUntilDatePickerValue!)
    }

    bookingScenario.actualBookingWindow = actualBookingWindow
    bookingScenario.actualSelection = await bookingsPage.getCurrentBookingSelection(resourceName)

    const continuePath = await bookingsPage.continueCurrentBooking()

    if (continuePath === '/basket') {
      await bookingsPage.assertBasketContainsBooking(resourceName)
      await bookingsPage.checkoutCurrentBasket()
    }

    await bookingsPage.assertCheckoutReady()
    await bookingsPage.completePurchase()
    await bookingsPage.assertPurchaseComplete()

    bookingScenario.purchaseCompleted = true
    bookingScenario.createdBookingLinks = await bookingsPage.getNewActivityBookingLinks(
      bookingScenario.activityBookingIdsBefore,
      resourceName,
    )
    bookingScenario.createdBookingIds = bookingScenario.createdBookingLinks.map((bookingLink) => bookingLink.id)
  },
)

Then('the booking should be confirmed with the expected booking details', async ({ bookingScenario }) => {
  expect(bookingScenario.actualBookingWindow, 'Expected the BDD booking step to capture the actual booking window.').toBeTruthy()
  expect(bookingScenario.actualSelection, 'Expected the BDD booking step to capture the booking editor selection.').toBeTruthy()
  expect(bookingScenario.resource, 'Expected the BDD booking step to capture the selected resource.').toBeTruthy()
  expect(bookingScenario.repeatPattern, 'Expected the BDD booking step to capture the requested repeat pattern.').toBeTruthy()
  expect(bookingScenario.createdBookingLinks.length, 'Expected the MP booking flow to create at least one booking link in My Activity.').toBeGreaterThan(0)

  const expectedMinimumCreatedBookings = bookingScenario.repeatPattern!.mode === 'none' ? 1 : 2
  const createdBookingTexts = bookingScenario.createdBookingLinks.map((bookingLink) => bookingLink.text)
  const createdBookingText = createdBookingTexts.join(' ')

  expect(
    bookingScenario.createdBookingLinks.length,
    `Expected repeat option "${bookingScenario.repeatPattern!.uiOptionLabel}" to create at least ${expectedMinimumCreatedBookings} booking(s).`,
  ).toBeGreaterThanOrEqual(expectedMinimumCreatedBookings)
  expect(createdBookingText.includes(bookingScenario.resourceName), `Expected created bookings to mention "${bookingScenario.resourceName}".`).toBe(true)
  expect(
    getExpectedBookingDateTexts(bookingScenario.actualBookingWindow!).some((candidateDateText) => createdBookingText.includes(candidateDateText)),
    `Expected created bookings to mention one of: ${getExpectedBookingDateTexts(bookingScenario.actualBookingWindow!).join(', ')}.`,
  ).toBe(true)
  expect(
    createdBookingText.includes(bookingScenario.actualBookingWindow!.startTimeLabel),
    `Expected created bookings to mention start time ${bookingScenario.actualBookingWindow!.startTimeLabel}.`,
  ).toBe(true)
  expect(bookingScenario.actualSelection!.resourceName).toBe(bookingScenario.resourceName)
  expect(bookingScenario.actualSelection!.repeatLabel).toBe(bookingScenario.repeatPattern!.uiOptionLabel)

  if (!bookingScenario.usedAlternative) {
    expect(bookingScenario.actualSelection!.startTimeLabel).toBe(bookingScenario.requestedBookingWindow!.startTimeLabel)
    expect(bookingScenario.actualSelection!.endTimeLabel).toBe(bookingScenario.requestedBookingWindow!.endTimeLabel)
  } else {
    expect(bookingScenario.actualSelection!.startTimeLabel).toBe(bookingScenario.actualBookingWindow!.startTimeLabel)
    expect(bookingScenario.actualSelection!.endTimeLabel).toBe(bookingScenario.actualBookingWindow!.endTimeLabel)
    expect(
      getDayDifference(bookingScenario.requestedBookingWindow!.dateISO, bookingScenario.actualBookingWindow!.dateISO),
      'Expected the alternative MP booking to stay on the same date or within the configured nearby future-day fallback window.',
    ).toBeLessThanOrEqual(alternativeFutureDaySearchWindow)
    expect(
      getDayDifference(bookingScenario.requestedBookingWindow!.dateISO, bookingScenario.actualBookingWindow!.dateISO),
      'Expected the alternative MP booking not to move backwards in time.',
    ).toBeGreaterThanOrEqual(0)
  }
})

function getExpectedBookingDateTexts(bookingWindow: MPBookingWindow) {
  const bookingDate = new Date(Date.UTC(bookingWindow.year, bookingWindow.month - 1, bookingWindow.day))
  const longUsDate = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(bookingDate)

  return [bookingWindow.datePickerValue, bookingWindow.dateISO, longUsDate]
}

function getDayDifference(leftDateISO: string, rightDateISO: string) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  const leftDate = new Date(`${leftDateISO}T00:00:00Z`)
  const rightDate = new Date(`${rightDateISO}T00:00:00Z`)

  return Math.round((rightDate.getTime() - leftDate.getTime()) / millisecondsPerDay)
}
