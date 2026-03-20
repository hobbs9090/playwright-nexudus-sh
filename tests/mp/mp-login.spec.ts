import { expect, test } from '@playwright/test'
import { NexudusApiClient } from '../../api/NexudusApiClient'
import { MPLoginPage } from '../../page-objects/mp/MPLoginPage'

const incorrectCredentialsMessage = 'The email or password is incorrect.'

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

  test('failed login shows the current incorrect-credentials message', async () => {
    await loginPage.login('bad@example.com', 'badpassword', 'error')
    await loginPage.assertErrorMessageContains(incorrectCredentialsMessage)
  })

  test('no email keeps sign in disabled when the email field is blank', async () => {
    await loginPage.login('', 'anypassword', 'disabled')
    await loginPage.assertSignInDisabled()
  })

  test('no password shows the current incorrect-credentials message', async () => {
    await loginPage.login('any@example.com', '', 'error')
    await loginPage.assertErrorMessageContains(incorrectCredentialsMessage)
  })

  test('login loads the dashboard and shows the current MP user in the profile menu @smoke', async ({ page }) => {
    await loginPage.login()
    await expect(page).toHaveURL(/\/(?:dashboards\/now|home)(?:\?.*)?$/)
    await loginPage.assertDashboardVisible(currentUserFullName)
    await loginPage.assertProfileMenuContains(currentUserFullName)
  })
})
