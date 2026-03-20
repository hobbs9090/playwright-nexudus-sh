import { expect, test } from '@playwright/test'
import { MPFaqPage } from '../../page-objects/mp/MPFaqPage'
import { MPHomePage } from '../../page-objects/mp/MPHomePage'
import { MPLoginPage } from '../../page-objects/mp/MPLoginPage'

test.describe('MP public documentation scenarios', () => {
  let faqPage: MPFaqPage
  let homePage: MPHomePage
  let loginPage: MPLoginPage

  test.beforeEach(async ({ page }) => {
    faqPage = new MPFaqPage(page)
    homePage = new MPHomePage(page)
    loginPage = new MPLoginPage(page)
  })

  test('MP-DOC-02 hero sign in reaches the anonymous login entry points from the public home hero section @docs', async ({
    page,
  }) => {
    await homePage.goto()

    const contentData = await homePage.getConfiguredContentData()

    await expect(page).toHaveURL(/\/home(?:\?.*)?$/)
    await homePage.assertPublicMarketingEntryPointsVisible(contentData.businessName)
    await homePage.assertFooterBrandingVisible(contentData.businessName)
    await homePage.goToHeroSignIn()

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/)
    await loginPage.assertAnonymousEntryPointsVisible(contentData.businessName)
    await loginPage.assertLoggedOutFooterVisible(contentData.businessName)
  })

  test('MP-DOC-03 public footer FAQ link reaches the FAQ landing page for anonymous visitors @docs', async ({ page }) => {
    await homePage.goto()

    const contentData = await homePage.getConfiguredContentData()

    await expect(page).toHaveURL(/\/home(?:\?.*)?$/)
    await homePage.assertFooterBrandingVisible(contentData.businessName)
    await homePage.assertFooterLinkVisible('FAQ')
    await homePage.clickFooterLink('FAQ')

    await expect(page).toHaveURL(/\/faq(?:\?.*)?$/)
    await expect(page).toHaveTitle(/Frequently Asked Questions/i)
    await faqPage.assertLandingPageVisible()
  })
})
