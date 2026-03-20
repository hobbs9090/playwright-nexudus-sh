import { expect, test } from '@playwright/test'
import { MPTourPage } from '../../page-objects/mp/MPTourPage'

function buildUniqueTourRequestDetails() {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  return {
    email: `pw.tour.${uniqueSuffix}@gmail.com`,
    fullName: `Playwright Tour Request ${uniqueSuffix}`,
    phoneNumber: '+447700900123',
  }
}

test.describe('MP public request a tour', () => {
  let tourPage: MPTourPage

  test.beforeEach(async ({ page }) => {
    tourPage = new MPTourPage(page)
  })

  test('creates a public tour request from the login page', async ({ page }) => {
    await tourPage.openFromLogin()

    await expect(tourPage.fullNameInput).toBeVisible()
    await expect(tourPage.emailInput).toBeVisible()
    await expect(tourPage.phoneNumberInput).toBeVisible()

    const requestDetails = buildUniqueTourRequestDetails()

    await tourPage.fillTourRequest(requestDetails)
    await page.pause()
    await tourPage.submitTourRequest()

    await expect(page).toHaveURL(/\/tour\/complete(?:\?.*)?$/)
    await expect(tourPage.gotItButton).toBeVisible()
  })
})
