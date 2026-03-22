import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { NexudusApiClient } from '../../../api/NexudusApiClient'
import { MPBookingsPage } from '../../../page-objects/mp/MPBookingsPage'
import { MPLoginPage } from '../../../page-objects/mp/MPLoginPage'
import { MPPortalPage } from '../../../page-objects/mp/MPPortalPage'
import {
  createMpBookingWindow,
  expandMpUtilityCandidateBookingWindows,
  parseAlternativeBookingPreference,
  parseMpRepeatPattern,
  shiftMpBookingWindowByDays,
  type MPBookingWindow,
} from '../../support/mp-bookings'
import { cancelPortalBooking } from '../../support/mp-bookings-api'
import { test, type BookingScenarioState } from '../support/bdd-test'
import {
  createBookingUtilityScenarioKey,
  deleteBookingUtilityRecord,
  readBookingUtilityRecord,
  resolveBookingUtilityAction,
  writeBookingUtilityRecord,
} from '../support/booking-utility'
import { resolveMemberCredentialsByName } from '../support/member-resolver'

const alternativeFutureDaySearchWindow = 7
const configuredUtilityAction = resolveBookingUtilityAction()
const hasDedicatedMemberCredentials =
  Boolean(process.env.NEXUDUS_MEMBER_EMAIL?.trim()) && Boolean(process.env.NEXUDUS_MEMBER_PASSWORD?.trim())
const { Given, Then, When } = createBdd(test)

Given('the MP booking utility action is configured', async ({ bookingScenario }) => {
  test.slow()
  test.skip(process.env.CI === 'true', 'MP booking utility scenarios are intended for manual utility runs, not CI.')

  bookingScenario.utilityAction = configuredUtilityAction
})

Given('member {string} can access the member portal', async ({ bookingScenario, page, request }, memberName: string) => {
  test.skip(
    process.env.CI === 'true' && !hasDedicatedMemberCredentials,
    'MP booking utility scenarios require a dedicated non-admin member account in NEXUDUS_MEMBER_EMAIL and NEXUDUS_MEMBER_PASSWORD when running in CI.',
  )

  const loginPage = new MPLoginPage(page)
  const nexudusApi = new NexudusApiClient(request)
  const resolvedMember = await resolveMemberCredentialsByName(request, memberName)
  const memberToken = await nexudusApi.createBearerTokenForCredentials(resolvedMember.email, resolvedMember.password)
  const currentUser = await nexudusApi.getCurrentUser(memberToken.access_token)
  const currentMemberName = String(currentUser.FullName || '').trim() || resolvedMember.resolvedName
  const currentMemberId = Number(currentUser.Id)

  expect(Number.isInteger(currentMemberId) && currentMemberId > 0, 'Expected the booking utility user profile to expose a numeric member id.').toBeTruthy()

  bookingScenario.accessToken = memberToken.access_token
  bookingScenario.currentMemberId = currentMemberId
  bookingScenario.currentMemberName = currentMemberName
  bookingScenario.requestedMember = resolvedMember

  await loginPage.login(resolvedMember.email, resolvedMember.password)
  await loginPage.assertDashboardVisible(currentMemberName)
})

When('they prepare a booking utility request for {string}', async ({ bookingScenario }, resourceName: string) => {
  bookingScenario.requestedUtilityRequest = {
    alternativePreference: 'false',
    bookingDate: '',
    bookingLength: '',
    repeatOptions: 'Does not repeat',
    resourceName,
    startTime: '',
  }
  bookingScenario.resourceName = resourceName
})

When('the requested date is {string}', async ({ bookingScenario }, bookingDate: string) => {
  expect(bookingScenario.requestedUtilityRequest, 'Expected the booking utility request to be prepared before setting the date.').toBeTruthy()
  bookingScenario.requestedUtilityRequest!.bookingDate = bookingDate
})

When('the requested start time is {string}', async ({ bookingScenario }, startTime: string) => {
  expect(bookingScenario.requestedUtilityRequest, 'Expected the booking utility request to be prepared before setting the start time.').toBeTruthy()
  bookingScenario.requestedUtilityRequest!.startTime = startTime
})

When('the requested length is {string}', async ({ bookingScenario }, bookingLength: string) => {
  expect(bookingScenario.requestedUtilityRequest, 'Expected the booking utility request to be prepared before setting the length.').toBeTruthy()
  bookingScenario.requestedUtilityRequest!.bookingLength = bookingLength
})

When('the requested repeat option is {string}', async ({ bookingScenario }, repeatOptions: string) => {
  expect(bookingScenario.requestedUtilityRequest, 'Expected the booking utility request to be prepared before setting the repeat option.').toBeTruthy()
  bookingScenario.requestedUtilityRequest!.repeatOptions = repeatOptions
})

When('alternative booking is {string}', async ({ bookingScenario }, alternativePreference: string) => {
  expect(bookingScenario.requestedUtilityRequest, 'Expected the booking utility request to be prepared before setting the alternative flag.').toBeTruthy()
  bookingScenario.requestedUtilityRequest!.alternativePreference = alternativePreference
})

When('they run the MP booking utility', async ({ bookingScenario, page, request }) => {
  expect(bookingScenario.utilityAction, 'Expected the MP booking utility action to be configured before running the utility.').toBeTruthy()
  expect(bookingScenario.requestedUtilityRequest, 'Expected the MP booking utility request to be fully prepared before running the utility.').toBeTruthy()

  const bookingsPage = new MPBookingsPage(page)
  const portalPage = new MPPortalPage(page)
  const requestedUtilityRequest = bookingScenario.requestedUtilityRequest!

  await portalPage.dismissOnboardingModalIfPresent()
  await page.goto('/bookings?tab=Resources&view=card', { waitUntil: 'domcontentloaded' })
  await bookingsPage.assertLoaded()

  const businessTimeZone = await bookingsPage.getBusinessTimeZone()
  const requestedBookingWindow = createMpBookingWindow({
    businessTimeZone,
    dateInput: requestedUtilityRequest.bookingDate,
    lengthInput: requestedUtilityRequest.bookingLength,
    startTimeInput: requestedUtilityRequest.startTime,
  })
  const repeatPattern = parseMpRepeatPattern(requestedUtilityRequest.repeatOptions, requestedBookingWindow)
  const allowAlternative = parseAlternativeBookingPreference(requestedUtilityRequest.alternativePreference)

  bookingScenario.allowAlternative = allowAlternative
  bookingScenario.repeatPattern = repeatPattern
  bookingScenario.requestedBookingWindow = requestedBookingWindow

  if (bookingScenario.utilityAction === 'add') {
    await runAddBookingUtility({ bookingScenario, page })
    return
  }

  await runDeleteBookingUtility({ bookingScenario, page, request })
})

Then('the booking utility should finish successfully', async ({ bookingScenario, page }) => {
  expect(bookingScenario.utilityAction, 'Expected the MP booking utility to record which action was executed.').toBeTruthy()

  if (bookingScenario.utilityAction === 'add') {
    expect(bookingScenario.actualBookingWindow, 'Expected add mode to capture the actual booking window.').toBeTruthy()
    expect(bookingScenario.actualSelection, 'Expected add mode to capture the booking editor selection.').toBeTruthy()
    expect(bookingScenario.repeatPattern, 'Expected add mode to capture the repeat pattern.').toBeTruthy()
    expect(bookingScenario.createdBookingLinks.length, 'Expected add mode to create at least one booking in My Activity.').toBeGreaterThan(0)

    const expectedMinimumCreatedBookings = bookingScenario.repeatPattern!.mode === 'none' ? 1 : 2
    const createdBookingText = bookingScenario.createdBookingLinks.map((bookingLink) => bookingLink.text).join(' ')

    expect(bookingScenario.createdBookingLinks.length).toBeGreaterThanOrEqual(expectedMinimumCreatedBookings)
    expect(createdBookingText.includes(bookingScenario.resourceName)).toBe(true)
    expect(
      getExpectedBookingDateTexts(bookingScenario.actualBookingWindow!).some((candidateDateText) => createdBookingText.includes(candidateDateText)),
    ).toBe(true)
    expect(createdBookingText.includes(bookingScenario.actualBookingWindow!.startTimeLabel)).toBe(true)
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
      ).toBeLessThanOrEqual(alternativeFutureDaySearchWindow)
      expect(
        getDayDifference(bookingScenario.requestedBookingWindow!.dateISO, bookingScenario.actualBookingWindow!.dateISO),
      ).toBeGreaterThanOrEqual(0)
    }

    return
  }

  expect(bookingScenario.deletedBookingIds.length, 'Expected delete mode to cancel at least one matching booking.').toBeGreaterThan(0)
  await expect(readBookingUtilityRecord(buildBookingUtilityScenarioKey(bookingScenario))).resolves.toBeNull()
})

async function runAddBookingUtility({
  bookingScenario,
  page,
}: {
  bookingScenario: BookingScenarioState
  page: Page
}) {
  const bookingsPage = new MPBookingsPage(page)
  const portalPage = new MPPortalPage(page)
  const requestedUtilityRequest = bookingScenario.requestedUtilityRequest!
  const requestedBookingWindow = bookingScenario.requestedBookingWindow!
  const repeatPattern = bookingScenario.repeatPattern!
  const allowAlternative = bookingScenario.allowAlternative

  await portalPage.dismissOnboardingModalIfPresent()

  bookingScenario.activityBookingIdsBefore = await bookingsPage.captureRenderedActivityBookingIds()
  const businessTimeZone = requestedBookingWindow.businessTimeZone

  const selectedResource = await bookingsPage.openBookingEditorForResource(requestedUtilityRequest.resourceName, requestedBookingWindow)

  bookingScenario.resource = selectedResource

  await bookingsPage.assertBookingEditorLoaded(requestedUtilityRequest.resourceName, requestedBookingWindow)

  const exactBookingWindowBookable = await bookingsPage.isCurrentBookingWindowBookable()
  let actualBookingWindow = requestedBookingWindow

  if (!exactBookingWindowBookable) {
    if (!allowAlternative) {
      throw new Error(
        `The requested slot for "${requestedUtilityRequest.resourceName}" on ${requestedBookingWindow.dateISO} at ${requestedBookingWindow.startTimeLabel} is unavailable and alternative booking was disabled.`,
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

        await bookingsPage.openBookingEditorForResource(requestedUtilityRequest.resourceName, candidateAlternativeWindow)
        await bookingsPage.assertBookingEditorLoaded(requestedUtilityRequest.resourceName, candidateAlternativeWindow)

        if (await bookingsPage.isCurrentBookingWindowBookable()) {
          futureDayAlternativeWindow = candidateAlternativeWindow
          break
        }
      }

      if (!futureDayAlternativeWindow) {
        throw new Error(
          `The requested slot for "${requestedUtilityRequest.resourceName}" on ${requestedBookingWindow.dateISO} at ${requestedBookingWindow.startTimeLabel} was unavailable, and no acceptable alternative was found within ${alternativeFutureDaySearchWindow} future day(s).`,
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
  bookingScenario.actualSelection = await bookingsPage.getCurrentBookingSelection(requestedUtilityRequest.resourceName)

  const continuePath = await bookingsPage.continueCurrentBooking()

  if (continuePath === '/basket') {
    await bookingsPage.assertBasketContainsBooking(requestedUtilityRequest.resourceName)
    await bookingsPage.checkoutCurrentBasket()
  }

  await bookingsPage.assertCheckoutReady()
  await bookingsPage.completePurchase()
  await bookingsPage.assertPurchaseComplete()

  bookingScenario.purchaseCompleted = true
  bookingScenario.createdBookingLinks = await bookingsPage.getNewActivityBookingLinks(
    bookingScenario.activityBookingIdsBefore,
    requestedUtilityRequest.resourceName,
  )
  bookingScenario.createdBookingIds = Array.from(new Set(bookingScenario.createdBookingLinks.map((bookingLink) => bookingLink.id)))
  await writeBookingUtilityRecord({
    bookingIds: bookingScenario.createdBookingIds,
    createdAtISO: new Date().toISOString(),
    memberName: bookingScenario.requestedMember?.requestedName || bookingScenario.currentMemberName,
    request: {
      alternativePreference: requestedUtilityRequest.alternativePreference,
      bookingDate: requestedUtilityRequest.bookingDate,
      bookingLength: requestedUtilityRequest.bookingLength,
      repeatOptions: requestedUtilityRequest.repeatOptions,
      resourceName: requestedUtilityRequest.resourceName,
      startTime: requestedUtilityRequest.startTime,
    },
    scenarioKey: buildBookingUtilityScenarioKey(bookingScenario),
  })
}

async function runDeleteBookingUtility({
  bookingScenario,
  page,
  request,
}: {
  bookingScenario: BookingScenarioState
  page: Page
  request: APIRequestContext
}) {
  const bookingsPage = new MPBookingsPage(page)
  const scenarioKey = buildBookingUtilityScenarioKey(bookingScenario)
  const storedRecord = await readBookingUtilityRecord(scenarioKey)
  const storedBookingIds = Array.from(new Set(storedRecord?.bookingIds || []))
  let bookingIdsToDelete = storedBookingIds

  if (storedBookingIds.length > 0) {
    bookingScenario.matchedBookingLinks = await bookingsPage.getActivityBookingLinksByIds(storedBookingIds)
  } else {
    const candidateBookingWindows = buildCandidateBookingWindows(bookingScenario)

    bookingScenario.matchedBookingLinks = await bookingsPage.findActivityBookingLinksMatching(
      bookingScenario.resourceName,
      candidateBookingWindows,
    )

    expect(
      bookingScenario.matchedBookingLinks.length,
      `Expected delete mode to find either stored booking ids or matching active bookings for "${bookingScenario.resourceName}". Run the utility in add mode first or make sure matching bookings still exist in My Activity.`,
    ).toBeGreaterThan(0)

    bookingIdsToDelete = bookingScenario.matchedBookingLinks.map((bookingLink) => bookingLink.id)
  }

  for (const bookingId of bookingIdsToDelete) {
    const bookingLink = await bookingsPage.findActivityBookingById(bookingId)

    if (bookingLink && !/cancelled/i.test(bookingLink.text)) {
      await cancelPortalBooking(request, bookingScenario.accessToken, bookingId)
    }

    bookingScenario.deletedBookingIds.push(bookingId)
    await bookingsPage.assertActivityBookingCancelledOrRemoved(bookingId)
  }

  await deleteBookingUtilityRecord(scenarioKey)
}

function buildCandidateBookingWindows(bookingScenario: BookingScenarioState) {
  const requestedBookingWindow = bookingScenario.requestedBookingWindow
  const repeatPattern = bookingScenario.repeatPattern

  expect(requestedBookingWindow, 'Expected the MP booking utility to capture the requested booking window before building candidate windows.').toBeTruthy()
  expect(repeatPattern, 'Expected the MP booking utility to capture the repeat pattern before building candidate windows.').toBeTruthy()

  return expandMpUtilityCandidateBookingWindows({
    allowAlternative: bookingScenario.allowAlternative,
    alternativeFutureDaySearchWindow,
    bookingWindow: requestedBookingWindow!,
    repeatPattern: repeatPattern!,
  })
}

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

function buildBookingUtilityScenarioKey(bookingScenario: BookingScenarioState) {
  const requestedUtilityRequest = bookingScenario.requestedUtilityRequest

  expect(
    requestedUtilityRequest,
    'Expected the MP booking utility request to be captured before building the utility scenario key.',
  ).toBeTruthy()

  return createBookingUtilityScenarioKey({
    alternativePreference: requestedUtilityRequest!.alternativePreference,
    bookingDate: requestedUtilityRequest!.bookingDate,
    bookingLength: requestedUtilityRequest!.bookingLength,
    memberName: bookingScenario.requestedMember?.requestedName || bookingScenario.currentMemberName,
    repeatOptions: requestedUtilityRequest!.repeatOptions,
    resourceName: requestedUtilityRequest!.resourceName,
    startTime: requestedUtilityRequest!.startTime,
  })
}
