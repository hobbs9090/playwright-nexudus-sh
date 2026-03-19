import type { NexudusCurrentUserResponse } from '../../api/NexudusApiClient'
import { generateUniqueName, getContributorInitials } from '../../helpers'
import { getConfiguredBaseURL } from '../../nexudus-config'
import { MPHomePage } from '../../page-objects/mp/MPHomePage'
import { expect, test } from './api-test'

test.describe('Nexudus API business settings', () => {
  test('can update Footer.SayingText for the current business, leave it updated, and verify it in MP @api', async (
    { nexudusApi, accessToken, page },
    testInfo,
  ) => {
    test.slow()

    const currentUser = await nexudusApi.getCurrentUser(accessToken)
    const currentBusinessId = getCurrentBusinessId(currentUser)
    const homePage = new MPHomePage(page)
    const mpHomeURL = buildMPHomeURL()
    const footerSayingText = await nexudusApi.getBusinessSetting(accessToken, {
      businessId: currentBusinessId,
      name: 'Footer.SayingText',
    })
    const originalFooterSayingText = footerSayingText.Value
    const updatedFooterSayingText = buildUniqueFooterSayingText(testInfo.title)

    expect(
      updatedFooterSayingText,
      'Expected the updated footer saying text to differ from the current business setting value.',
    ).not.toBe(originalFooterSayingText)
    expect(
      updatedFooterSayingText,
      'Expected the updated footer saying text to include the seeded timestamp and random suffix.',
    ).toMatch(buildFooterSayingSeedPattern())

    const updatedBusinessSetting = await nexudusApi.updateBusinessSetting(accessToken, {
      BusinessId: footerSayingText.BusinessId,
      Id: footerSayingText.Id,
      Name: footerSayingText.Name,
      Value: updatedFooterSayingText,
    })

    expect(updatedBusinessSetting.Value).toBe(updatedFooterSayingText)

    await expect
      .poll(() => nexudusApi.getBusinessSettingById(accessToken, footerSayingText.Id).then((setting) => setting.Value))
      .toBe(updatedFooterSayingText)

    await expect
      .poll(
        async () => {
          await homePage.goto(buildCacheBustedMPHomeURL(mpHomeURL))
          return homePage.getFooterText()
        },
        { timeout: 45000 },
      )
      .toContain(updatedFooterSayingText)

    await homePage.assertFooterSayingVisible(updatedFooterSayingText)
  })

  test('can update Calendars.DefaultView for the current business and restore it afterwards @api', async ({
    nexudusApi,
    accessToken,
  }) => {
    test.slow()

    const currentUser = await nexudusApi.getCurrentUser(accessToken)
    const currentBusinessId = getCurrentBusinessId(currentUser)
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

function buildUniqueFooterSayingText(testTitle: string) {
  const normalizedTitle = testTitle.replace(/[^a-z0-9]+/gi, ' ').trim()

  return generateUniqueName(`Playwright ${normalizedTitle}`, getContributorInitials())
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
