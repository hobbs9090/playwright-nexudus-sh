import { expect, test } from '@playwright/test'
import { LoginPage } from '../page-objects/LoginPage'

test.describe('MP staging login', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
  })

  test('logs into MP staging with the configured MP credentials', async ({ page }) => {
    await loginPage.login()
    await expect(page).toHaveURL(/\/home(?:\?.*)?$/)
    await expect(page.getByText('My dashboard')).toBeVisible()
  })
})
