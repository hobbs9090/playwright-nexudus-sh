import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { NexudusApiClient } from '../../../api/NexudusApiClient'
import { MPBookingsPage } from '../../../page-objects/mp/MPBookingsPage'
import { MPLoginPage } from '../../../page-objects/mp/MPLoginPage'
import { MPPortalPage } from '../../../page-objects/mp/MPPortalPage'
import { buildBackofficeBookingPayload, findBackofficeBookingsMatchingWindows } from '../../support/ap-bookings'
import {
  createBackofficeApiClientWithAPLogin,
  type NexudusBackofficeApiClient,
  type NexudusBackofficeBookingResponse,
  type NexudusBackofficeResourceResponse,
} from '../../support/backoffice-api'
import {
  createMpBookingWindow,
  expandMpBookingWindowsForRepeatPattern,
  expandMpUtilityCandidateBookingWindows,
  getUtcIsoRangeForMpBookingWindow,
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
  parseBookingUtilityMode,
  readBookingUtilityRecord,
  resolveBookingUtilityAction,
  resolveBookingUtilityMode,
  writeBookingUtilityRecord,
} from '../support/booking-utility'
import { resolveMemberCredentialsByName } from '../support/member-resolver'

const alternativeFutureDaySearchWindow = 7
const configuredUtilityAction = resolveBookingUtilityAction()
const configuredUtilityMode = resolveBookingUtilityMode()
const hasDedicatedMemberCredentials =
  Boolean(process.env.NEXUDUS_MEMBER_EMAIL?.trim()) && Boolean(process.env.NEXUDUS_MEMBER_PASSWORD?.trim())
const { Given, Then, When } = createBdd(test)

Given('the booking utility configuration is ready', async ({ bookingScenario }) => {
  test.slow()
  test.skip(process.env.CI === 'true', 'Booking utility scenarios are intended for manual utility runs, not CI.')

  bookingScenario.utilityAction = configuredUtilityAction
  bookingScenario.utilityMode = configuredUtilityMode
})

Given('member {string} can access the member portal', async ({ bookingScenario, request }, memberName: string) => {
  test.skip(
    process.env.CI === 'true' && !hasDedicatedMemberCredentials,
    'Booking utility scenarios require a dedicated non-admin member account in NEXUDUS_MEMBER_EMAIL and NEXUDUS_MEMBER_PASSWORD when running in CI.',
  )

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
})

Given('the booking utility mode is {string}', async ({ bookingScenario }, rawUtilityMode: string) => {
  bookingScenario.utilityMode = parseBookingUtilityMode(rawUtilityMode, 'booking utility Mode column')
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

When('they run the booking utility', async ({ bookingScenario, page, request }) => {
  expect(bookingScenario.utilityAction, 'Expected the booking utility action to be configured before running the utility.').toBeTruthy()
  expect(bookingScenario.utilityMode, 'Expected the booking utility mode to be configured before running the utility.').toBeTruthy()
  expect(bookingScenario.requestedUtilityRequest, 'Expected the booking utility request to be fully prepared before running the utility.').toBeTruthy()

  const requestedUtilityRequest = bookingScenario.requestedUtilityRequest!
  let businessTimeZone = ''
  let backofficeApi: NexudusBackofficeApiClient | null = null

  try {
    if (bookingScenario.utilityMode === 'mp') {
      const requestedMember = bookingScenario.requestedMember

      expect(requestedMember, 'Expected the booking utility to resolve member credentials before running the MP utility mode.').toBeTruthy()

      const loginPage = new MPLoginPage(page)
      const bookingsPage = new MPBookingsPage(page)
      const portalPage = new MPPortalPage(page)

      await loginPage.login(requestedMember!.email, requestedMember!.password)
      await loginPage.assertDashboardVisible(bookingScenario.currentMemberName)
      await portalPage.dismissOnboardingModalIfPresent()
      await page.goto('/bookings?tab=Resources&view=card', { waitUntil: 'domcontentloaded' })
      await bookingsPage.assertLoaded()
      businessTimeZone = await bookingsPage.getBusinessTimeZone()
    } else {
      backofficeApi = await createBackofficeApiClientWithAPLogin(page)
      const authenticatedApUser = await backofficeApi.getAuthenticatedUser()

      businessTimeZone = String(authenticatedApUser.DefaultSimpleTimeZoneNameIana || '').trim()
      expect(businessTimeZone, 'Expected the authenticated AP user payload to expose the current business IANA timezone.').toBeTruthy()
    }

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
      await runAddBookingUtility({ backofficeApi, bookingScenario, page })
      return
    }

    await runDeleteBookingUtility({ backofficeApi, bookingScenario, page, request })
  } finally {
    await backofficeApi?.dispose()
  }
})

Then('the booking utility should finish successfully', async ({ bookingScenario }) => {
  expect(bookingScenario.utilityAction, 'Expected the booking utility to record which action was executed.').toBeTruthy()

  if (bookingScenario.utilityAction === 'add') {
    expect(bookingScenario.actualBookingWindow, 'Expected add mode to capture the actual booking window.').toBeTruthy()
    expect(bookingScenario.repeatPattern, 'Expected add mode to capture the repeat pattern.').toBeTruthy()

    if (bookingScenario.utilityMode === 'mp') {
      expect(bookingScenario.actualSelection, 'Expected MP add mode to capture the booking editor selection.').toBeTruthy()
      expect(bookingScenario.createdBookingLinks.length, 'Expected MP add mode to create at least one booking in My Activity.').toBeGreaterThan(0)

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

    const expectedBookingWindows = expandMpBookingWindowsForRepeatPattern(
      bookingScenario.actualBookingWindow!,
      bookingScenario.repeatPattern!,
    )
    const expectedBookingKeys = new Set(expectedBookingWindows.map(buildBackofficeBookingWindowKey))
    const createdBookingKeys = new Set(bookingScenario.createdBackofficeBookings.map(buildBackofficeBookingResponseKey))

    expect(
      bookingScenario.createdBackofficeBookings.length,
      'Expected AP add mode to create one back-office booking for each expected occurrence.',
    ).toBe(expectedBookingWindows.length)
    expect(bookingScenario.createdBackofficeBookings.every((booking) => booking.ResourceName === bookingScenario.resourceName)).toBe(true)
    expect(
      bookingScenario.createdBackofficeBookings.every((booking) => booking.CoworkerId === bookingScenario.currentMemberId),
      'Expected AP add mode to create bookings for the resolved member id.',
    ).toBe(true)

    for (const expectedBookingKey of expectedBookingKeys) {
      expect(createdBookingKeys.has(expectedBookingKey)).toBe(true)
    }

    expectAlternativeBehavior(bookingScenario)
    return
  }

  expect(bookingScenario.deletedBookingIds.length, 'Expected delete mode to cancel at least one matching booking.').toBeGreaterThan(0)
  await expect(
    readBookingUtilityRecord(buildBookingUtilityScenarioKey(bookingScenario), bookingScenario.utilityMode || 'mp'),
  ).resolves.toBeNull()
})

async function runAddBookingUtility({
  backofficeApi,
  bookingScenario,
  page,
}: {
  backofficeApi: NexudusBackofficeApiClient | null
  bookingScenario: BookingScenarioState
  page: Page
}) {
  if (bookingScenario.utilityMode === 'ap') {
    expect(backofficeApi, 'Expected AP utility mode to create an authenticated back-office API client.').toBeTruthy()
    await runApAddBookingUtility({ backofficeApi: backofficeApi!, bookingScenario })
    return
  }

  await runMpAddBookingUtility({ bookingScenario, page })
}

async function runDeleteBookingUtility({
  backofficeApi,
  bookingScenario,
  page,
  request,
}: {
  backofficeApi: NexudusBackofficeApiClient | null
  bookingScenario: BookingScenarioState
  page: Page
  request: APIRequestContext
}) {
  if (bookingScenario.utilityMode === 'ap') {
    expect(backofficeApi, 'Expected AP utility mode to create an authenticated back-office API client.').toBeTruthy()
    await runApDeleteBookingUtility({ backofficeApi: backofficeApi!, bookingScenario })
    return
  }

  await runMpDeleteBookingUtility({ bookingScenario, page, request })
}

async function runMpAddBookingUtility({
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
      throw new Error(buildUnavailableSlotMessage(requestedUtilityRequest.resourceName, requestedBookingWindow))
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
        throw new Error(buildAlternativeNotFoundMessage(requestedUtilityRequest.resourceName, requestedBookingWindow))
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
  await persistBookingUtilityRecord(bookingScenario)
}

async function runApAddBookingUtility({
  backofficeApi,
  bookingScenario,
}: {
  backofficeApi: NexudusBackofficeApiClient
  bookingScenario: BookingScenarioState
}) {
  const requestedUtilityRequest = bookingScenario.requestedUtilityRequest!
  const requestedBookingWindow = bookingScenario.requestedBookingWindow!
  const repeatPattern = bookingScenario.repeatPattern!
  const authenticatedApUser = await backofficeApi.getAuthenticatedUser()
  const currentMemberId = await resolveBackofficeCoworkerId(backofficeApi, bookingScenario)
  const resource = await backofficeApi.findResourceByName(requestedUtilityRequest.resourceName, authenticatedApUser.DefaultBusinessId)
  const candidateBaseWindows =
    bookingScenario.allowAlternative && repeatPattern.mode === 'none'
      ? expandMpUtilityCandidateBookingWindows({
          allowAlternative: bookingScenario.allowAlternative,
          alternativeFutureDaySearchWindow,
          bookingWindow: requestedBookingWindow,
          repeatPattern,
        })
      : [requestedBookingWindow]

  bookingScenario.resource = {
    id: resource.Id,
    name: resource.Name,
  }

  let actualBookingWindow: MPBookingWindow | null = null
  let bookingWindowsToCreate: MPBookingWindow[] = []

  for (const candidateBaseWindow of candidateBaseWindows) {
    const candidateBookingWindows = expandMpBookingWindowsForRepeatPattern(candidateBaseWindow, repeatPattern)
    const candidateWindowsAvailable = await areBackofficeBookingWindowsAvailable({
      backofficeApi,
      bookingWindows: candidateBookingWindows,
      coworkerId: currentMemberId,
      coworkerName: bookingScenario.currentMemberName,
      resource,
    })

    if (candidateWindowsAvailable) {
      actualBookingWindow = candidateBaseWindow
      bookingWindowsToCreate = candidateBookingWindows
      break
    }
  }

  if (!actualBookingWindow) {
    if (!bookingScenario.allowAlternative) {
      throw new Error(buildUnavailableSlotMessage(requestedUtilityRequest.resourceName, requestedBookingWindow))
    }

    throw new Error(buildAlternativeNotFoundMessage(requestedUtilityRequest.resourceName, requestedBookingWindow))
  }

  bookingScenario.actualBookingWindow = actualBookingWindow
  bookingScenario.usedAlternative =
    actualBookingWindow.dateISO !== requestedBookingWindow.dateISO ||
    actualBookingWindow.startTimeLabel !== requestedBookingWindow.startTimeLabel

  bookingScenario.createdBackofficeBookings = []

  try {
    for (const bookingWindow of bookingWindowsToCreate) {
      const createResponse = await backofficeApi.createBooking(
        buildBackofficeBookingPayload({
        bookingWindow,
        coworkerId: currentMemberId,
        coworkerName: bookingScenario.currentMemberName,
        resource,
        }),
      )

      if (createResponse.Value) {
        bookingScenario.createdBackofficeBookings.push(createResponse.Value)
      }
    }

    expect(
      bookingScenario.createdBackofficeBookings.length,
      `Expected AP mode to return one created booking response for each requested occurrence of "${requestedUtilityRequest.resourceName}".`,
    ).toBe(bookingWindowsToCreate.length)

    bookingScenario.createdBookingIds = Array.from(new Set(bookingScenario.createdBackofficeBookings.map((booking) => booking.Id)))
    await persistBookingUtilityRecord(bookingScenario)
  } catch (error) {
    const createdBookingIds = Array.from(new Set(bookingScenario.createdBackofficeBookings.map((booking) => booking.Id)))

    if (createdBookingIds.length > 0) {
      await backofficeApi.cancelBookings(createdBookingIds).catch(() => {})
    }

    throw error
  }
}

async function runMpDeleteBookingUtility({
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
  const storedRecord = await readBookingUtilityRecord(scenarioKey, 'mp')
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

  await deleteBookingUtilityRecord(scenarioKey, 'mp')
}

async function runApDeleteBookingUtility({
  backofficeApi,
  bookingScenario,
}: {
  backofficeApi: NexudusBackofficeApiClient
  bookingScenario: BookingScenarioState
}) {
  const scenarioKey = buildBookingUtilityScenarioKey(bookingScenario)
  const storedRecord = await readBookingUtilityRecord(scenarioKey, 'ap')
  let bookingIdsToDelete = Array.from(new Set(storedRecord?.bookingIds || []))

  if (bookingIdsToDelete.length === 0) {
    const authenticatedApUser = await backofficeApi.getAuthenticatedUser()
    const currentMemberId = await resolveBackofficeCoworkerId(backofficeApi, bookingScenario)
    const resource = await backofficeApi.findResourceByName(bookingScenario.resourceName, authenticatedApUser.DefaultBusinessId)
    const candidateBookingWindows = buildCandidateBookingWindows(bookingScenario)

    bookingScenario.resource = {
      id: resource.Id,
      name: resource.Name,
    }
    bookingScenario.matchedBackofficeBookings = await findBackofficeBookingsMatchingWindows({
      backofficeApi,
      bookingWindows: candidateBookingWindows,
      coworkerId: currentMemberId,
      resourceId: resource.Id,
    })

    expect(
      bookingScenario.matchedBackofficeBookings.length,
      `Expected AP delete mode to find either stored booking ids or matching active bookings for "${bookingScenario.resourceName}". Run the utility in add mode first or make sure matching bookings still exist in AP.`,
    ).toBeGreaterThan(0)

    bookingIdsToDelete = bookingScenario.matchedBackofficeBookings.map((booking) => booking.Id)
  }

  await backofficeApi.cancelBookings(bookingIdsToDelete)
  bookingScenario.deletedBookingIds.push(...bookingIdsToDelete)

  for (const bookingId of bookingIdsToDelete) {
    await expect
      .poll(() => backofficeApi.getBookingIfExists(bookingId), {
        message: `Expected AP booking ${bookingId} to be removed after the back-office cancel command.`,
        timeout: 15000,
      })
      .toBeNull()
  }

  await deleteBookingUtilityRecord(scenarioKey, 'ap')
}

function buildCandidateBookingWindows(bookingScenario: BookingScenarioState) {
  const requestedBookingWindow = bookingScenario.requestedBookingWindow
  const repeatPattern = bookingScenario.repeatPattern

  expect(requestedBookingWindow, 'Expected the booking utility to capture the requested booking window before building candidate windows.').toBeTruthy()
  expect(repeatPattern, 'Expected the booking utility to capture the repeat pattern before building candidate windows.').toBeTruthy()

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

  expect(requestedUtilityRequest, 'Expected the booking utility request to be captured before building the utility scenario key.').toBeTruthy()

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

async function persistBookingUtilityRecord(bookingScenario: BookingScenarioState) {
  const requestedUtilityRequest = bookingScenario.requestedUtilityRequest!

  await writeBookingUtilityRecord({
    bookingIds: bookingScenario.createdBookingIds,
    bookingMode: bookingScenario.utilityMode || 'mp',
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

async function areBackofficeBookingWindowsAvailable({
  backofficeApi,
  bookingWindows,
  coworkerId,
  coworkerName,
  resource,
}: {
  backofficeApi: NexudusBackofficeApiClient
  bookingWindows: MPBookingWindow[]
  coworkerId: number
  coworkerName: string
  resource: NexudusBackofficeResourceResponse
}) {
  for (const bookingWindow of bookingWindows) {
    const availability = await backofficeApi.checkBookingAvailability(
      buildBackofficeBookingPayload({
        bookingWindow,
        coworkerId,
        coworkerName,
        resource,
      }),
    )

    if (!availability.available) {
      return false
    }
  }

  return true
}

function buildUnavailableSlotMessage(resourceName: string, bookingWindow: MPBookingWindow) {
  return `The requested slot for "${resourceName}" on ${bookingWindow.dateISO} at ${bookingWindow.startTimeLabel} is unavailable and alternative booking was disabled.`
}

function buildAlternativeNotFoundMessage(resourceName: string, bookingWindow: MPBookingWindow) {
  return `The requested slot for "${resourceName}" on ${bookingWindow.dateISO} at ${bookingWindow.startTimeLabel} was unavailable, and no acceptable alternative was found within ${alternativeFutureDaySearchWindow} future day(s).`
}

function expectAlternativeBehavior(bookingScenario: BookingScenarioState) {
  if (!bookingScenario.usedAlternative) {
    expect(bookingScenario.actualBookingWindow!.startTimeLabel).toBe(bookingScenario.requestedBookingWindow!.startTimeLabel)
    expect(bookingScenario.actualBookingWindow!.endTimeLabel).toBe(bookingScenario.requestedBookingWindow!.endTimeLabel)
    return
  }

  expect(getDayDifference(bookingScenario.requestedBookingWindow!.dateISO, bookingScenario.actualBookingWindow!.dateISO)).toBeLessThanOrEqual(
    alternativeFutureDaySearchWindow,
  )
  expect(getDayDifference(bookingScenario.requestedBookingWindow!.dateISO, bookingScenario.actualBookingWindow!.dateISO)).toBeGreaterThanOrEqual(0)
}

function buildBackofficeBookingWindowKey(bookingWindow: MPBookingWindow) {
  const { endUtcISOString, startUtcISOString } = getUtcIsoRangeForMpBookingWindow(bookingWindow)

  return `${startUtcISOString}|${endUtcISOString}`
}

function buildBackofficeBookingResponseKey(booking: Pick<NexudusBackofficeBookingResponse, 'FromTime' | 'ToTime'>) {
  return `${booking.FromTime}|${booking.ToTime}`
}

function normalizeUtilityName(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

async function resolveBackofficeCoworkerId(
  backofficeApi: NexudusBackofficeApiClient,
  bookingScenario: BookingScenarioState,
) {
  const requestedMember = bookingScenario.requestedMember
  const currentMemberName = bookingScenario.currentMemberName
  const coworkers = await backofficeApi.listCoworkers()
  const matchingCoworker = coworkers.find((coworker) => {
    const coworkerEmail = String(coworker.Email || '').trim().toLowerCase()
    const coworkerName = normalizeUtilityName(String(coworker.FullName || ''))

    return (
      (requestedMember?.email && coworkerEmail === requestedMember.email.trim().toLowerCase()) ||
      coworkerName === normalizeUtilityName(currentMemberName)
    )
  })

  const resolvedCoworkerId = Number(matchingCoworker?.Id)

  expect(
    Number.isInteger(resolvedCoworkerId) && resolvedCoworkerId > 0,
    `Expected AP mode to resolve a coworker id for "${requestedMember?.requestedName || currentMemberName}" through the back-office coworkers API.`,
  ).toBeTruthy()

  bookingScenario.currentMemberId = resolvedCoworkerId

  return resolvedCoworkerId
}
