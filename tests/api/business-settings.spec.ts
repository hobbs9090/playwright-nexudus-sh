import type { NexudusApiClient, NexudusCurrentUserResponse } from '../../api/NexudusApiClient'
import { generateUniqueName, getContributorInitials } from '../../helpers'
import { getConfiguredBaseURL } from '../../nexudus-config'
import { MPHomePage } from '../../page-objects/mp/MPHomePage'
import { getConfiguredLocationSelectorLabel } from '../../test-environments'
import { expect, test } from './api-test'

test.describe('Nexudus API business settings', () => {
  test('can update Footer.SayingText and verify it in MP @api', async (
    { nexudusApi, accessToken, page },
    testInfo,
  ) => {
    test.slow()

    const currentUser = await nexudusApi.getCurrentUser(accessToken)
    const currentBusinessId = await getConfiguredMpBusinessId(nexudusApi, accessToken, currentUser)
    const footerSeed = buildFooterSeed()
    const homePage = new MPHomePage(page)
    const mpHomeURL = buildMPHomeURL()
    const footerSayingText = await nexudusApi.getBusinessSetting(accessToken, {
      businessId: currentBusinessId,
      name: 'Footer.SayingText',
    })
    const footerSayingAuthor = await nexudusApi.getBusinessSetting(accessToken, {
      businessId: currentBusinessId,
      name: 'Footer.SayingAuthor',
    })
    const originalFooterSayingText = footerSayingText.Value
    const originalFooterSayingAuthor = footerSayingAuthor.Value
    const updatedFooterSayingText = buildUniqueFooterSayingText(testInfo.title, footerSeed)
    const updatedFooterSayingAuthor = buildUniqueFooterSayingAuthor(footerSeed)

    expect(
      updatedFooterSayingText,
      'Expected the updated footer saying text to differ from the current business setting value.',
    ).not.toBe(originalFooterSayingText)
    expect(
      updatedFooterSayingAuthor,
      'Expected the updated footer saying author to differ from the current business setting value.',
    ).not.toBe(originalFooterSayingAuthor)
    expect(
      updatedFooterSayingText,
      'Expected the updated footer saying text to include the seeded timestamp and random suffix.',
    ).toMatch(buildFooterSayingSeedPattern())
    expect(
      updatedFooterSayingAuthor,
      'Expected the updated footer saying author to include Playwright and the shared seed.',
    ).toBe(`Playwright ${footerSeed}`)

    const updatedBusinessSetting = await nexudusApi.updateBusinessSetting(accessToken, {
      BusinessId: footerSayingText.BusinessId,
      Id: footerSayingText.Id,
      Name: footerSayingText.Name,
      Value: updatedFooterSayingText,
    })
    const updatedAuthorSetting = await nexudusApi.updateBusinessSetting(accessToken, {
      BusinessId: footerSayingAuthor.BusinessId,
      Id: footerSayingAuthor.Id,
      Name: footerSayingAuthor.Name,
      Value: updatedFooterSayingAuthor,
    })

    expect(updatedBusinessSetting.Value).toBe(updatedFooterSayingText)
    expect(updatedAuthorSetting.Value).toBe(updatedFooterSayingAuthor)

    await expect
      .poll(() => nexudusApi.getBusinessSettingById(accessToken, footerSayingText.Id).then((setting) => setting.Value))
      .toBe(updatedFooterSayingText)
    await expect
      .poll(() => nexudusApi.getBusinessSettingById(accessToken, footerSayingAuthor.Id).then((setting) => setting.Value))
      .toBe(updatedFooterSayingAuthor)

    await expect
      .poll(
        async () => {
          await homePage.goto(buildCacheBustedMPHomeURL(mpHomeURL))
          return homePage.getFooterText()
        },
        { timeout: 45000 },
      )
      .toContain(updatedFooterSayingText)
    await expect
      .poll(
        async () => {
          await homePage.goto(buildCacheBustedMPHomeURL(mpHomeURL))
          return homePage.getFooterText()
        },
        { timeout: 45000 },
      )
      .toContain(updatedFooterSayingAuthor)

    await homePage.assertFooterSayingVisible(updatedFooterSayingText)
    await homePage.assertFooterSayingAuthorVisible(updatedFooterSayingAuthor)
    await homePage.scrollToFooterAndPause()
  })

  test('can update Calendars.DefaultView for the current business and restore it afterwards @api', async ({
    nexudusApi,
    accessToken,
  }) => {
    test.slow()

    const currentUser = await nexudusApi.getCurrentUser(accessToken)
    const currentBusinessId = await getConfiguredMpBusinessId(nexudusApi, accessToken, currentUser)
    const calendarDefaultView = await nexudusApi.getBusinessSetting(accessToken, {
      businessId: currentBusinessId,
      name: 'Calendars.DefaultView',
    })
    const originalCalendarDefaultView = calendarDefaultView.Value
    const updatedCalendarDefaultView = getUpdatedCalendarDefaultView(originalCalendarDefaultView)

    expect(
      updatedCalendarDefaultView,
      'Expected the updated calendar default view to differ from the current business setting value.',
    ).not.toBe(originalCalendarDefaultView)

    try {
      const updatedBusinessSetting = await nexudusApi.updateBusinessSetting(accessToken, {
        BusinessId: calendarDefaultView.BusinessId,
        Id: calendarDefaultView.Id,
        Name: calendarDefaultView.Name,
        Value: updatedCalendarDefaultView,
      })

      expect(updatedBusinessSetting.Value).toBe(updatedCalendarDefaultView)

      await expect
        .poll(() =>
          nexudusApi.getBusinessSettingById(accessToken, calendarDefaultView.Id).then((setting) => setting.Value),
        )
        .toBe(updatedCalendarDefaultView)
    } finally {
      const restoredBusinessSetting = await nexudusApi.updateBusinessSetting(accessToken, {
        BusinessId: calendarDefaultView.BusinessId,
        Id: calendarDefaultView.Id,
        Name: calendarDefaultView.Name,
        Value: originalCalendarDefaultView,
      })

      expect(restoredBusinessSetting.Value).toBe(originalCalendarDefaultView)

      await expect
        .poll(() =>
          nexudusApi.getBusinessSettingById(accessToken, calendarDefaultView.Id).then((setting) => setting.Value),
        )
        .toBe(originalCalendarDefaultView)
    }
  })
})

function buildFooterSeed() {
  return generateUniqueName('', getContributorInitials()).trim()
}

function buildUniqueFooterSayingText(testTitle: string, footerSeed: string) {
  const normalizedTitle = testTitle.replace(/[^a-z0-9]+/gi, ' ').trim()

  return `Playwright ${normalizedTitle} ${footerSeed}`
}

function buildUniqueFooterSayingAuthor(footerSeed: string) {
  return `Playwright ${footerSeed}`
}

function buildFooterSayingSeedPattern() {
  const contributorInitials = getContributorInitials()

  return new RegExp(` \\d{4} \\d{4} ${contributorInitials}[a-z]{5}$`)
}

function buildMPHomeURL() {
  return new URL('/home', getConfiguredBaseURL('NEXUDUS_MP_BASE_URL')).toString()
}

function buildCacheBustedMPHomeURL(baseURL: string) {
  const url = new URL(baseURL)
  url.searchParams.set('playwright_footer_saying', Date.now().toString())

  return url.toString()
}

function getCurrentBusinessId(currentUser: NexudusCurrentUserResponse) {
  const currentBusinessId = Number(currentUser.DefaultBusinessId)

  expect(
    Number.isInteger(currentBusinessId) && currentBusinessId > 0,
    'Expected the current API user profile to expose a numeric default business id.',
  ).toBeTruthy()

  return currentBusinessId
}

async function getConfiguredMpBusinessId(
  nexudusApi: NexudusApiClient,
  accessToken: string,
  currentUser: NexudusCurrentUserResponse,
) {
  const configuredBusinessName = getConfiguredLocationSelectorLabel('mp')
  const defaultBusinessId = getCurrentBusinessId(currentUser)
  const defaultBusinessName = currentUser.DefaultBusinessName?.toString().trim()

  if (defaultBusinessName === configuredBusinessName) {
    return defaultBusinessId
  }

  const accessibleBusinessIds = (currentUser.Businesses || [])
    .map((businessId) => Number(businessId))
    .filter((businessId) => Number.isInteger(businessId) && businessId > 0)

  expect(
    accessibleBusinessIds.length,
    `Expected the current API user to expose at least one accessible business id when resolving "${configuredBusinessName}".`,
  ).toBeGreaterThan(0)

  const accessibleBusinesses = await Promise.all(
    accessibleBusinessIds.map((businessId) => nexudusApi.getBusiness(accessToken, businessId)),
  )

  const configuredBusiness = accessibleBusinesses.find(
    (business) => business.Name?.toString().trim() === configuredBusinessName,
  )

  expect(
    configuredBusiness?.Id,
    `Expected the current API user to have access to the configured MP business "${configuredBusinessName}".`,
  ).toBeTruthy()

  return configuredBusiness!.Id
}

function getUpdatedCalendarDefaultView(currentCalendarDefaultView: string | null) {
  return currentCalendarDefaultView === '2' ? '3' : '2'
}
