import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { MPFaqPage } from '../../../page-objects/mp/MPFaqPage'
import { MPHomePage } from '../../../page-objects/mp/MPHomePage'
import { MPLoginPage } from '../../../page-objects/mp/MPLoginPage'
import { test } from '../support/bdd-test'

const { Given, When, Then } = createBdd(test)

Given('I am on the public member portal home page', async ({ page }) => {
  const homePage = new MPHomePage(page)

  await homePage.goto()

  const contentData = await homePage.getConfiguredContentData()

  await expect(page).toHaveURL(/\/home(?:\?.*)?$/)
  await homePage.assertPublicMarketingEntryPointsVisible(contentData.businessName)
  await homePage.assertFooterBrandingVisible(contentData.businessName)
})

When('I open the hero sign-in link', async ({ page }) => {
  const homePage = new MPHomePage(page)

  await homePage.goToHeroSignIn()
})

Then('I should reach the anonymous login page', async ({ page }) => {
  const loginPage = new MPLoginPage(page)

  await expect(page).toHaveURL(/\/login(?:\?.*)?$/)
  await loginPage.assertLoginFormVisible()
})

When('I open the FAQ link from the public footer', async ({ page }) => {
  const homePage = new MPHomePage(page)

  await homePage.assertFooterLinkVisible('FAQ')
  await homePage.clickFooterLink('FAQ')
})

Then('I should reach the public FAQ landing page', async ({ page }) => {
  const faqPage = new MPFaqPage(page)

  await expect(page).toHaveURL(/\/faq(?:\?.*)?$/)
  await expect(page).toHaveTitle(/Frequently Asked Questions/i)
  await faqPage.assertLandingPageVisible()
})
