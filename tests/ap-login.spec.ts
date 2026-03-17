import { expect, test } from '@playwright/test'
import { LoginPage } from '../page-objects/LoginPage'

test.describe('AP login', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
  })

  test('shows a clear error message when invalid AP details are provided', async () => {
    await loginPage.login('bad@example.com', 'badpassword', false)
    await loginPage.assertErrorMessage('The email or password is incorrect.')
  })

  test('logs into AP with the configured AP credentials', async ({ page }) => {
    await loginPage.login()
    await expect(page).toHaveURL('/dashboards/now')
  })
})
