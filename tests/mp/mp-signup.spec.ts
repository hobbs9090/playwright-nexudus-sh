import { test } from '@playwright/test'
import { MPSignupAccountType, MPSignupDetails, MPSignupPage } from '../../page-objects/mp/MPSignupPage'

function createSignupDetails(accountType: MPSignupAccountType): MPSignupDetails {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const slug = accountType.toLowerCase()
  const email = `pw.signup.${slug}.${uniqueSuffix}@gmail.com`

  return {
    accountType,
    fullName: accountType === 'Individual' ? `Playwright Individual ${uniqueSuffix}` : `Playwright Company Admin ${uniqueSuffix}`,
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
  let signupPage: MPSignupPage

  test.beforeEach(async ({ page }) => {
    signupPage = new MPSignupPage(page)
  })

  test('creates an individual MP account from the public signup journey', async () => {
    await signupPage.createAccount(createSignupDetails('Individual'))
  })

  test('creates a company MP account from the public signup journey', async () => {
    await signupPage.createAccount(createSignupDetails('Company'))
  })
})
