import { test, expect } from '@playwright/test'
import { LoginPage } from '../page-objects/LoginPage'
   
test.describe('Nexudus Test Suite', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
  })

  test('#001 - log-in page shows a clear error message when invalid details are provided', async ({ page }) => {
    await loginPage.login('bad@example.com', 'badpassword', false)
    await loginPage.assertErrorMessage('The email or password is incorrect.')
  })

  test('#002 - Log-in page logs user in when valid details are provided', async ({ page }) => {
    await loginPage.login()
    await expect(page).toHaveURL('/dashboards/now')
  })
})
