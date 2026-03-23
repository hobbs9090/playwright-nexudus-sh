import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { MPLoginPage } from '../../../../page-objects/mp/MPLoginPage'
import { test } from '../../support/bdd-test'

const { Given, Then, When } = createBdd(test)

Given('I am on the member portal login page', async ({ page }) => {
  const loginPage = new MPLoginPage(page)

  await page.goto('/login')
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/)
  await loginPage.assertLoginFormVisible()
})

When('I sign in with the configured member credentials', async ({ page }) => {
  const loginPage = new MPLoginPage(page)

  await loginPage.submitCurrentLoginForm()
})

Then('I should reach the authenticated member dashboard', async ({ page }) => {
  const loginPage = new MPLoginPage(page)

  await expect(page).toHaveURL(/\/(?:dashboards\/now|home)(?:\?.*)?$/)
  await loginPage.assertDashboardVisible()
})
