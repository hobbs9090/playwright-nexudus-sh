import { expect, Locator, Page } from '@playwright/test'
import { AbstractPage } from '../shared/AbstractPage'

export type MPSignupAccountType = 'Individual' | 'Company'
export type MPSignupPetPreference = 'Cats' | 'Dogs'

export type MPSignupDetails = {
  accountType: MPSignupAccountType
  fullName: string
  email: string
  companyName: string
  billingAddress: string
  billingState: string
  billingCity: string
  billingPostCode: string
  billingEmail: string
  taxIdNumber: string
  address: string
  country: string
  state: string
  city: string
  postCode: string
  petPreference: MPSignupPetPreference
}

export class MPSignupPage extends AbstractPage {
  readonly createAccountLink: Locator
  readonly dismissStartupNoticeButton: Locator
  readonly continueWithoutPlanButton: Locator
  readonly continueButton: Locator
  readonly accountTypeSelect: Locator
  readonly fullNameInput: Locator
  readonly emailInput: Locator
  readonly companyNameInput: Locator
  readonly billingAddressInput: Locator
  readonly billingStateInput: Locator
  readonly billingCityInput: Locator
  readonly billingPostCodeInput: Locator
  readonly billingEmailInput: Locator
  readonly taxIdNumberInput: Locator
  readonly addressInput: Locator
  readonly countrySelect: Locator
  readonly stateInput: Locator
  readonly cityInput: Locator
  readonly postCodeInput: Locator
  readonly petPreferenceSelect: Locator
  readonly termsCheckbox: Locator
  readonly termsText: Locator
  readonly completionHeading: Locator
  readonly goToDashboardLink: Locator

  constructor(page: Page) {
    super(page)
    this.createAccountLink = page.getByRole('link', { name: 'Create an account' })
    this.dismissStartupNoticeButton = page.getByRole('button', { name: 'Okay, got it!' })
    this.continueWithoutPlanButton = page.getByRole('button', { name: 'Continue without a plan' })
    this.continueButton = page.getByRole('button', { name: 'Continue' })
    this.accountTypeSelect = page.getByLabel('Type')
    this.fullNameInput = page.getByRole('textbox', { name: 'Full name*' })
    this.emailInput = page.getByRole('textbox', { name: 'Email*' })
    this.companyNameInput = page.getByRole('textbox', { name: 'Company/Org. name*' })
    this.billingAddressInput = page.locator('textarea[name="BillingAddress"]')
    this.billingStateInput = page.locator('input[name="BillingState"]')
    this.billingCityInput = page.locator('input[name="BillingCityName"]')
    this.billingPostCodeInput = page.locator('input[name="BillingPostCode"]')
    this.billingEmailInput = page.locator('input[name="BillingEmail"]')
    this.taxIdNumberInput = page.locator('input[name="TaxIDNumber"]')
    this.addressInput = page.locator('textarea[name="Address"]')
    this.countrySelect = page.locator('select[name="CountryId"]')
    this.stateInput = page.locator('input[name="State"]')
    this.cityInput = page.locator('input[name="CityName"]')
    this.postCodeInput = page.locator('input[name="PostCode"]')
    this.petPreferenceSelect = page.locator('select[name="Custom1"]')
    this.termsCheckbox = page.locator('#GeneralTermsAcceptedOnline')
    this.termsText = page.getByText('I agree with our terms and')
    this.completionHeading = page.getByRole('heading', { name: /Welcome to / })
    this.goToDashboardLink = page.getByText('Go to dashboard')
  }

  async createAccount(details: MPSignupDetails) {
    await this.openSignupForm()
    await this.submitSignupForm(details)
  }

  async openSignupForm() {
    await this.page.goto('/login')
    await expect(this.createAccountLink).toBeVisible()
    await this.createAccountLink.click()
    await expect(this.page).toHaveURL(/\/signup\/plans(?:\?.*)?$/)
    await this.dismissStartupNoticeIfPresent()
    await expect(this.continueWithoutPlanButton).toBeVisible()
    await this.continueWithoutPlanButton.click()
    await expect(this.continueButton).toBeVisible()
    await this.continueButton.click()
  }

  async dismissStartupNoticeIfPresent() {
    const startupNoticeVisible = await this.dismissStartupNoticeButton.isVisible().catch(() => false)

    if (startupNoticeVisible) {
      await this.dismissStartupNoticeButton.click()
      return
    }

    await this.dismissStartupNoticeButton
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(async () => {
        await this.dismissStartupNoticeButton.click()
      })
      .catch(() => {})
  }

  async fillSignupForm(details: MPSignupDetails) {
    await this.accountTypeSelect.selectOption({ label: details.accountType })
    await this.termsText.click()
    await expect(this.termsCheckbox).toBeChecked()

    await this.fullNameInput.fill(details.fullName)
    await this.emailInput.fill(details.email)
    await this.companyNameInput.fill(details.companyName)
    await this.billingAddressInput.fill(details.billingAddress)
    await this.billingStateInput.fill(details.billingState)
    await this.billingCityInput.fill(details.billingCity)
    await this.billingPostCodeInput.fill(details.billingPostCode)
    await this.billingEmailInput.fill(details.billingEmail)
    await this.taxIdNumberInput.fill(details.taxIdNumber)
    await this.addressInput.fill(details.address)
    await this.countrySelect.selectOption({ label: details.country })
    await this.stateInput.fill(details.state)
    await this.cityInput.fill(details.city)
    await this.postCodeInput.fill(details.postCode)
    await this.petPreferenceSelect.selectOption({ label: details.petPreference })
  }

  async assertSignupFormVisible() {
    for (const field of [
      this.accountTypeSelect,
      this.fullNameInput,
      this.emailInput,
      this.companyNameInput,
      this.billingAddressInput,
      this.billingStateInput,
      this.billingCityInput,
      this.billingPostCodeInput,
      this.billingEmailInput,
      this.taxIdNumberInput,
      this.addressInput,
      this.countrySelect,
      this.stateInput,
      this.cityInput,
      this.postCodeInput,
      this.petPreferenceSelect,
      this.termsText,
      this.continueButton,
    ]) {
      await expect(field).toBeVisible()
    }
  }

  async submitSignupForm(details: MPSignupDetails) {
    await this.fillSignupForm(details)
    await this.continueButton.click()
    await this.assertCompletionVisible()
  }

  async assertCompletionVisible() {
    await expect(this.page).toHaveURL(/\/signup\/payment\/complete(?:\?.*)?$/)
    await expect(this.completionHeading).toBeVisible()
    await expect(this.goToDashboardLink).toBeVisible()
  }

  async goToDashboard() {
    await expect(this.goToDashboardLink).toBeVisible()
    await this.goToDashboardLink.click()
  }
}
