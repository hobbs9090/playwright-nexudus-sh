import type { NexudusCurrentUserResponse } from '../../api/NexudusApiClient'
import { generateUniqueName } from '../../helpers'
import { expect, test } from './api-test'

test.describe('Nexudus API business settings', () => {
  test('can update Footer.SayingText for the current business and restore it afterwards @api', async (
    { nexudusApi, accessToken },
    testInfo,
  ) => {
    test.slow()

    const currentUser = await nexudusApi.getCurrentUser(accessToken)
    const currentBusinessId = getCurrentBusinessId(currentUser)
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

    try {
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
    } finally {
      const restoredBusinessSetting = await nexudusApi.updateBusinessSetting(accessToken, {
        BusinessId: footerSayingText.BusinessId,
        Id: footerSayingText.Id,
        Name: footerSayingText.Name,
        Value: originalFooterSayingText,
      })

      expect(restoredBusinessSetting.Value).toBe(originalFooterSayingText)

      await expect
        .poll(() => nexudusApi.getBusinessSettingById(accessToken, footerSayingText.Id).then((setting) => setting.Value))
        .toBe(originalFooterSayingText)
    }
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

  return generateUniqueName(`Playwright ${normalizedTitle}`)
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
