import { expect, test } from '@playwright/test'
import { MPLoginPage } from '../../page-objects/mp/MPLoginPage'

test.describe('MP staging login', () => {
  let loginPage: MPLoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new MPLoginPage(page)
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

  test('logs into MP staging with the configured MP credentials @smoke', async ({ page }) => {
    await loginPage.login()
    await expect(page).toHaveURL(/\/(?:dashboards\/now|home)(?:\?.*)?$/)
    await loginPage.assertDashboardVisible()
  })
})
