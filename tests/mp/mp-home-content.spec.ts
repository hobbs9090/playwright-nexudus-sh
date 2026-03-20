import { test } from '@playwright/test'
import { MPHomePage } from '../../page-objects/mp/MPHomePage'

test.describe('MP public footer and home content settings', () => {
  let homePage: MPHomePage

  test.beforeEach(async ({ page }) => {
    homePage = new MPHomePage(page)
    await homePage.goto()
  })

  test('renders footer branding and copyright content for the configured MP business', async () => {
    const contentData = await homePage.getConfiguredContentData()

    await homePage.assertFooterBrandingVisible(contentData.businessName)
  })

  test('renders the configured MP plans, add-ons, featured articles, and locations on the home page', async () => {
    const contentData = await homePage.getConfiguredContentData()

    await homePage.assertConfiguredPlansAndProductsVisible(contentData)
    await homePage.assertConfiguredFeaturedArticlesVisible(contentData)
    await homePage.assertConfiguredLocationsVisible(contentData)
  })
})
