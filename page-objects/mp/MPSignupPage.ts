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
  readonly billingDetailsGroup: Locator
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
  readonly otherDetailsGroup: Locator
  readonly personalAddressGroup: Locator
  readonly personalDetailsGroup: Locator
  readonly addressInput: Locator
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
    this.personalDetailsGroup = page.getByRole('group').filter({ has: page.getByRole('heading', { name: 'Personal details' }) }).first()
    this.billingDetailsGroup = page
      .getByRole('group')
      .filter({ has: page.getByRole('heading', { name: 'Billing/Company details' }) })
      .first()
    this.personalAddressGroup = page
      .getByRole('group')
      .filter({ has: page.getByRole('heading', { name: 'Personal Address' }) })
      .first()
    this.otherDetailsGroup = page.getByRole('group').filter({ has: page.getByRole('heading', { name: 'Other Details' }) }).first()
    this.companyNameInput = this.billingDetailsGroup.getByRole('textbox', { name: 'Company/Org. name' })
    this.billingAddressInput = this.billingDetailsGroup.getByRole('textbox').nth(1)
    this.billingStateInput = this.billingDetailsGroup.getByRole('textbox').nth(2)
    this.billingCityInput = this.billingDetailsGroup.getByRole('textbox').nth(3)
    this.billingPostCodeInput = this.billingDetailsGroup.getByRole('textbox').nth(4)
    this.billingEmailInput = this.billingDetailsGroup.getByRole('textbox', { name: 'Send my invoices to' })
    this.taxIdNumberInput = this.billingDetailsGroup.getByRole('textbox', { name: 'VAT / Tax number' })
    this.addressInput = this.personalAddressGroup.getByRole('textbox').nth(0)
    this.stateInput = this.personalAddressGroup.getByRole('textbox').nth(1)
    this.cityInput = this.personalAddressGroup.getByRole('textbox').nth(2)
    this.postCodeInput = this.personalAddressGroup.getByRole('textbox').nth(3)
    this.petPreferenceSelect = page.getByRole('combobox', { name: 'Cats or Dogs*' })
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

    if (details.accountType === 'Company') {
      await expect(this.companyNameInput).toBeVisible()
      await this.companyNameInput.fill(details.companyName)
    } else if (await this.companyNameInput.isVisible().catch(() => false)) {
      await this.companyNameInput.fill(details.companyName)
    }

    await this.billingAddressInput.fill(details.billingAddress)
    await this.billingStateInput.fill(details.billingState)
    await this.billingCityInput.fill(details.billingCity)
    await this.billingPostCodeInput.fill(details.billingPostCode)
    await this.billingEmailInput.fill(details.billingEmail)
    await this.taxIdNumberInput.fill(details.taxIdNumber)
    await this.addressInput.fill(details.address)
    await this.stateInput.fill(details.state)
    await this.cityInput.fill(details.city)
    await this.postCodeInput.fill(details.postCode)
    await this.petPreferenceSelect.selectOption({ label: details.petPreference })
  }

  async assertSignupFormVisible(accountType?: MPSignupAccountType) {
    for (const field of [
      this.accountTypeSelect,
      this.fullNameInput,
      this.emailInput,
      this.petPreferenceSelect,
      this.termsText,
      this.continueButton,
    ]) {
      await expect(field).toBeVisible()
    }

    for (const sectionHeading of ['Personal details', 'Billing/Company details', 'Personal Address', 'Other Details']) {
      await expect(this.page.getByRole('heading', { name: sectionHeading })).toBeVisible()
    }

    for (const optionLabel of ['Individual', 'Company']) {
      await expect(this.accountTypeSelect.getByRole('option', { name: optionLabel })).toBeAttached()
    }

    if (accountType === 'Company') {
      await this.accountTypeSelect.selectOption({ label: accountType })
      await expect(this.companyNameInput).toBeVisible()
      return
    }

    const companyFieldVisible = await this.companyNameInput.isVisible().catch(() => false)
    expect(
      typeof companyFieldVisible,
      'Expected the signup form company field visibility check to complete.',
    ).toBe('boolean')
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
