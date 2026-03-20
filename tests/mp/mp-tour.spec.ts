import { expect, test } from '@playwright/test'
import { generateUniqueName, getContributorInitials } from '../../helpers'
import { MPTourPage } from '../../page-objects/mp/MPTourPage'

function buildUniqueTourRequestDetails() {
  const fullName = generateUniqueName('Playwright Tour Request', getContributorInitials())
  const emailSlug = fullName.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '')

  return {
    email: `pw.tour.${emailSlug}@gmail.com`,
    fullName,
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
    await tourPage.submitTourRequest()

    await expect(page).toHaveURL(/\/tour\/complete(?:\?.*)?$/)
    await expect(tourPage.gotItButton).toBeVisible()
  })
})
