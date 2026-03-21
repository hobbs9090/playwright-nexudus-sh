import type { NexudusCurrentUserResponse } from '../../api/NexudusApiClient'
import { generateUniqueName, getContributorInitials } from '../../helpers'
import { getConfiguredBaseURL } from '../../nexudus-config'
import { MPHomePage } from '../../page-objects/mp/MPHomePage'
import { expect, test } from './api-test'
import { getConfiguredMpBusinessContext } from './configured-mp-business'

test.describe('Nexudus API business settings', () => {
  test('can update Footer.SayingText and verify it in MP @api', async (
    { nexudusApi, backofficeApi, accessToken, page },
    testInfo,
  ) => {
    test.slow()

    const currentUser = await nexudusApi.getCurrentUser(accessToken)
    const { businessId: currentBusinessId } = await getConfiguredMpBusinessContext(nexudusApi, accessToken, currentUser)
    const footerSeed = buildFooterSeed()
    const homePage = new MPHomePage(page)
    const mpHomeURL = buildMPHomeURL()
    const footerSayingText = await backofficeApi.getBusinessSetting({
      businessId: currentBusinessId,
      name: 'Footer.SayingText',
    })
    const footerSayingAuthor = await backofficeApi.getBusinessSetting({
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

    const updatedBusinessSetting = await backofficeApi.updateBusinessSetting({
      BusinessId: footerSayingText.BusinessId,
      Id: footerSayingText.Id,
      Name: footerSayingText.Name,
      Value: updatedFooterSayingText,
    })
    const updatedAuthorSetting = await backofficeApi.updateBusinessSetting({
      BusinessId: footerSayingAuthor.BusinessId,
      Id: footerSayingAuthor.Id,
      Name: footerSayingAuthor.Name,
      Value: updatedFooterSayingAuthor,
    })

    expect(updatedBusinessSetting.Value).toBe(updatedFooterSayingText)
    expect(updatedAuthorSetting.Value).toBe(updatedFooterSayingAuthor)

    await expect
      .poll(() => backofficeApi.getBusinessSettingById(footerSayingText.Id).then((setting) => setting.Value))
      .toBe(updatedFooterSayingText)
    await expect
      .poll(() => backofficeApi.getBusinessSettingById(footerSayingAuthor.Id).then((setting) => setting.Value))
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
    backofficeApi,
    accessToken,
  }) => {
    test.slow()

    const currentUser = await nexudusApi.getCurrentUser(accessToken)
    const { businessId: currentBusinessId } = await getConfiguredMpBusinessContext(nexudusApi, accessToken, currentUser)
    const calendarDefaultView = await backofficeApi.getBusinessSetting({
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
      const updatedBusinessSetting = await backofficeApi.updateBusinessSetting({
        BusinessId: calendarDefaultView.BusinessId,
        Id: calendarDefaultView.Id,
        Name: calendarDefaultView.Name,
        Value: updatedCalendarDefaultView,
      })

      expect(updatedBusinessSetting.Value).toBe(updatedCalendarDefaultView)

      await expect
        .poll(() => backofficeApi.getBusinessSettingById(calendarDefaultView.Id).then((setting) => setting.Value))
        .toBe(updatedCalendarDefaultView)
    } finally {
      const restoredBusinessSetting = await backofficeApi.updateBusinessSetting({
        BusinessId: calendarDefaultView.BusinessId,
        Id: calendarDefaultView.Id,
        Name: calendarDefaultView.Name,
        Value: originalCalendarDefaultView,
      })

      expect(restoredBusinessSetting.Value).toBe(originalCalendarDefaultView)

      await expect
        .poll(() => backofficeApi.getBusinessSettingById(calendarDefaultView.Id).then((setting) => setting.Value))
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

function getUpdatedCalendarDefaultView(currentCalendarDefaultView: string | null) {
  return currentCalendarDefaultView === '2' ? '3' : '2'
}
