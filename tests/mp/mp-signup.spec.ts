import { test } from '@playwright/test'
import { generateUniqueName, getContributorInitials } from '../../helpers'
import { MPLoginPage } from '../../page-objects/mp/MPLoginPage'
import { MPPortalPage } from '../../page-objects/mp/MPPortalPage'
import { MPSignupAccountType, MPSignupDetails, MPSignupPage } from '../../page-objects/mp/MPSignupPage'

function createSignupDetails(accountType: MPSignupAccountType): MPSignupDetails {
  const uniqueSuffix = generateUniqueName(accountType === 'Individual' ? 'Playwright Individual' : 'Playwright Company Admin', getContributorInitials())
  const emailSlug = uniqueSuffix.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '')
  const slug = accountType.toLowerCase()
  const email = `pw.signup.${slug}.${emailSlug}@gmail.com`

  return {
    accountType,
    fullName: uniqueSuffix,
    email,
    companyName: accountType === 'Individual' ? `Playwright Individual Co ${uniqueSuffix}` : `Playwright Company ${uniqueSuffix}`,
    billingAddress: '1 Testing Street',
    billingState: 'Greater London',
    billingCity: 'London',
    billingPostCode: 'SW1A 1AA',
    billingEmail: email,
    taxIdNumber: 'GB123456789',
    address: '1 Testing Street',
    country: 'United Kingdom',
    state: 'Greater London',
    city: 'London',
    postCode: 'SW1A 1AA',
    petPreference: accountType === 'Individual' ? 'Cats' : 'Dogs',
  }
}

test.describe('MP staging account creation', () => {
  let loginPage: MPLoginPage
  let portalPage: MPPortalPage
  let signupPage: MPSignupPage

  test.beforeEach(async ({ page }) => {
    loginPage = new MPLoginPage(page)
    portalPage = new MPPortalPage(page)
    signupPage = new MPSignupPage(page)
    await portalPage.installBlockingDialogSuppression()
  })

  test('individual account opens create account, shows the signup fields, and reaches the dashboard with the new full name @dg', async () => {
    const details = createSignupDetails('Individual')

    await signupPage.openSignupForm()
    await signupPage.assertSignupFormVisible('Individual')
    await signupPage.submitSignupForm(details)
    await signupPage.goToDashboard()
    await loginPage.assertDashboardVisible(details.fullName)
    await portalPage.dismissOnboardingModalIfPresent()
    await loginPage.assertProfileMenuContains(details.fullName)
  })

  test('company account opens create account, shows the signup fields, and reaches the dashboard with the new full name @dg', async () => {
    const details = createSignupDetails('Company')

    await signupPage.openSignupForm()
    await signupPage.assertSignupFormVisible('Company')
    await signupPage.submitSignupForm(details)
    await signupPage.goToDashboard()
    await loginPage.assertDashboardVisible(details.fullName)
    await portalPage.dismissOnboardingModalIfPresent()
    await loginPage.assertProfileMenuContains(details.fullName)
  })
})
