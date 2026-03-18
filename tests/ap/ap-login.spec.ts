import { expect, test } from '@playwright/test'
import { APLoginPage } from '../../page-objects/ap/APLoginPage'

test.describe('AP login', () => {
  let loginPage: APLoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new APLoginPage(page)
  })

  test('shows a clear error message when invalid AP details are provided', async () => {
    await loginPage.login('bad@example.com', 'badpassword', false)
    await loginPage.assertErrorMessage('The email or password is incorrect.')
  })

  test('logs into AP with the configured AP credentials @smoke', async ({ page }) => {
    await loginPage.login()
    await expect(page).toHaveURL(/\/(?:dashboards\/now|home)?(?:\?.*)?$/)
    await loginPage.assertDashboardVisible()
  })
})
