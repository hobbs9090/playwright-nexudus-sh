import { expect, test } from '@playwright/test'
import { MPTourPage } from '../../page-objects/mp/MPTourPage'

test.describe('MP public request a tour', () => {
  let tourPage: MPTourPage

  test.beforeEach(async ({ page }) => {
    tourPage = new MPTourPage(page)
  })

  test('opens from login and shows required-field validation when submitted empty', async ({ page }) => {
    await tourPage.openFromLogin()

    await expect(tourPage.fullNameInput).toBeVisible()
    await expect(tourPage.emailInput).toBeVisible()
    await expect(tourPage.phoneNumberInput).toBeVisible()

    await tourPage.submitEmptyRequest()
    await tourPage.assertRequiredFieldValidationVisible()
    await tourPage.dismissValidationDialog()

    await expect(page).toHaveURL(/\/tour(?:\?.*)?$/)
  })
})
