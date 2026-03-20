import { expect, test } from '@playwright/test'
import { NexudusApiClient } from '../../api/NexudusApiClient'
import { MPLoginPage } from '../../page-objects/mp/MPLoginPage'

test.describe('MP staging login', () => {
  let loginPage: MPLoginPage
  let currentUserFullName: string

  test.beforeEach(async ({ page, request }) => {
    loginPage = new MPLoginPage(page)

    const nexudusApi = new NexudusApiClient(request)
    const token = await nexudusApi.createBearerToken()
    const currentUser = await nexudusApi.getCurrentUser(token.access_token)

    currentUserFullName = String(currentUser.FullName || '').trim()
    expect(currentUserFullName, 'Expected the MP API profile to expose the current user full name.').toBeTruthy()
  })

  test('shows a clear error message when invalid MP details are provided', async () => {
    await loginPage.login('bad@example.com', 'badpassword', 'error')
    await loginPage.assertErrorMessage()
  })

  test('keeps sign in disabled when email is missing', async () => {
    await loginPage.login('', 'anypassword', 'disabled')
    await loginPage.assertSignInDisabled()
  })

  test('shows a clear error message when password is missing', async () => {
    await loginPage.login('any@example.com', '', 'error')
    await loginPage.assertErrorMessage()
  })

  test('login loads the dashboard and shows the current MP user in the profile menu @smoke', async ({ page }) => {
    await loginPage.login()
    await expect(page).toHaveURL(/\/(?:dashboards\/now|home)(?:\?.*)?$/)
    await loginPage.assertDashboardVisible(currentUserFullName)
    await loginPage.assertProfileMenuContains(currentUserFullName)
  })
})
