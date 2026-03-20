import type { Page } from '@playwright/test'
import type { NexudusCurrentUserResponse } from '../../api/NexudusApiClient'
import { getConfiguredBaseURL } from '../../nexudus-config'
import { MPBookingsPage } from '../../page-objects/mp/MPBookingsPage'
import { getCredentials } from '../../test-environments'
import { expect, test } from './api-test'

test.describe('MP calendar business settings', () => {
  let bookingsPage: MPBookingsPage
  let currentBusinessId: number
  let currentBusinessName: string

  test.beforeEach(async ({ accessToken, nexudusApi, page }) => {
    expect(accessToken.trim(), 'Expected the API suite beforeEach to retrieve a bearer token before each test.').toBeTruthy()

    const currentUser = await nexudusApi.getCurrentUser(accessToken)

    bookingsPage = new MPBookingsPage(page)
    currentBusinessId = getCurrentBusinessId(currentUser)
    currentBusinessName = getCurrentBusinessName(currentUser)
  })

  test('Calendars.DefaultView updates the business setting by API and shows the configured view in MP bookings @api @dg', async ({
    accessToken,
    nexudusApi,
    page,
  }) => {
    test.slow()
    test.fail(
      true,
      'Current MP bookings routes do not expose a distinguishable Calendars.DefaultView value in the rendered portal state after the API mutation.',
    )

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
      const updateResponse = await nexudusApi.updateBusinessSettingMutation(accessToken, {
        BusinessId: calendarDefaultView.BusinessId,
        Id: calendarDefaultView.Id,
        Name: calendarDefaultView.Name,
        Value: updatedCalendarDefaultView,
      })

      expect(updateResponse.Message).toBe(`Space Setting "${currentBusinessName}" was successfully updated.`)

      const updatedBusinessSetting = await nexudusApi.getBusinessSettingById(accessToken, calendarDefaultView.Id)

      expect(updatedBusinessSetting.Value).toBe(updatedCalendarDefaultView)

      await loginToMPForCalendarVerification(page)
      const bookingsResponse = await bookingsPage.goto(buildCacheBustedMPBookingsURL())
      await page.waitForTimeout(5000)
      await bookingsPage.assertLoaded()
      expect(bookingsResponse, 'Expected MP bookings navigation to return a response.').toBeTruthy()

      const bookingsHtml = await bookingsResponse!.text()
      const configuredDefaultView = extractCalendarDefaultViewFromHTML(bookingsHtml)

      expect(
        configuredDefaultView,
        'Expected the MP bookings HTML bootstrap payload to include the updated Calendars.DefaultView value.',
      ).toBe(updatedCalendarDefaultView)
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

function buildCacheBustedMPBookingsURL() {
  const url = new URL('/bookings', getConfiguredBaseURL('NEXUDUS_MP_BASE_URL'))
  url.searchParams.set('playwright_calendar_default_view', Date.now().toString())

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

function getCurrentBusinessName(currentUser: NexudusCurrentUserResponse) {
  const currentBusinessName = String(currentUser.DefaultBusinessName || '').trim()

  expect(currentBusinessName, 'Expected the current API user profile to expose a default business name.').toBeTruthy()

  return currentBusinessName
}

function getUpdatedCalendarDefaultView(currentCalendarDefaultView: string | null) {
  return currentCalendarDefaultView === '2' ? '3' : '2'
}

async function loginToMPForCalendarVerification(page: Page) {
  const credentials = getCredentials('NEXUDUS_MP_EMAIL', 'NEXUDUS_MP_PASSWORD')

  await page.goto('/login')
  await page.getByLabel('Email').fill(credentials.email)
  await page.getByLabel('Password').fill(credentials.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForTimeout(3000)
}

function extractCalendarDefaultViewFromHTML(html: string) {
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)

  expect(nextDataMatch, 'Expected the MP bookings page HTML to include a __NEXT_DATA__ script payload.').toBeTruthy()

  const nextData = JSON.parse(nextDataMatch![1]) as {
    props?: {
      mobxStore?: {
        appStore?: {
          configuration?: {
            Calendars?: {
              DefaultView?: string | null
            }
          }
        }
      }
    }
  }

  return nextData.props?.mobxStore?.appStore?.configuration?.Calendars?.DefaultView ?? null
}
