import { expect, test } from '@playwright/test'
import { MPHomePage } from '../../page-objects/mp/MPHomePage'
import { MPLoginPage } from '../../page-objects/mp/MPLoginPage'

test.describe('MP public access', () => {
  let homePage: MPHomePage
  let loginPage: MPLoginPage

  test.beforeEach(async ({ page }) => {
    homePage = new MPHomePage(page)
    loginPage = new MPLoginPage(page)
  })

  test('access member portal shows the public entry points and reaches the login form from the header sign in link @dg', async ({
    page,
  }) => {
    await homePage.goto()

    const contentData = await homePage.getConfiguredContentData()

    await expect(page).toHaveURL(/\/home(?:\?.*)?$/)
    await homePage.assertPublicMarketingEntryPointsVisible(contentData.businessName)
    await homePage.assertFooterBrandingVisible(contentData.businessName)

    await homePage.goToHeaderSignIn()

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/)
    await loginPage.assertLoginFormVisible()
  })
})
