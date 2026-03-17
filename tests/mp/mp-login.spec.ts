import { expect, test } from '@playwright/test'
import { MPLoginPage } from '../../page-objects/mp/MPLoginPage'

test.describe('MP staging login', () => {
  let loginPage: MPLoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new MPLoginPage(page)
  })

  test('logs into MP staging with the configured MP credentials', async ({ page }) => {
    await loginPage.login()
    await expect(page).toHaveURL(/\/home(?:\?.*)?$/)
    await loginPage.assertDashboardVisible()
  })
})
