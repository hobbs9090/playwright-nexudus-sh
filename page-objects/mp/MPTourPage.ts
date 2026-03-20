import { expect, Locator, Page } from '@playwright/test'
import { AbstractPage } from '../shared/AbstractPage'

export type MPTourRequestDetails = {
  email: string
  fullName: string
  phoneNumber: string
}

export class MPTourPage extends AbstractPage {
  readonly requestTourLink: Locator
  readonly requestTourHeading: Locator
  readonly fullNameInput: Locator
  readonly emailInput: Locator
  readonly phoneNumberInput: Locator
  readonly termsAgreementText: Locator
  readonly requestTourButton: Locator
  readonly completionHeading: Locator
  readonly completionMessage: Locator
  readonly gotItButton: Locator

  constructor(page: Page) {
    super(page)
    this.requestTourLink = page.getByRole('link', { name: /request a tour/i })
    this.requestTourHeading = page.getByRole('heading', { name: /Request a tour/ })
    this.fullNameInput = page.getByRole('textbox', { name: 'Full name*' })
    this.emailInput = page.getByRole('textbox', { name: 'Email*' })
    this.phoneNumberInput = page.getByRole('textbox', { name: 'Phone number*' })
    this.termsAgreementText = page.getByText('I agree with our terms and')
    this.requestTourButton = page.getByRole('button', { name: /Request a tour/ })
    this.completionHeading = page.getByRole('heading', { name: 'Your tour has been requested!' })
    this.completionMessage = page.getByText('You will receive a confirmation email when your tour is confirmed.')
    this.gotItButton = page.getByRole('button', { name: 'Got it!' })
  }

  async openFromLogin() {
    await this.page.goto('/login')
    await this.requestTourLink.click()
    await expect(this.page).toHaveURL(/\/tour(?:\?.*)?$/)
    await expect(this.requestTourHeading).toBeVisible({ timeout: 30000 })
  }

  async fillTourRequest(details: MPTourRequestDetails) {
    await this.fullNameInput.fill(details.fullName)
    await this.emailInput.fill(details.email)
    await this.phoneNumberInput.fill(details.phoneNumber)
    await this.termsAgreementText.click()
  }

  async submitTourRequest() {
    await this.requestTourButton.click()
    await expect(this.page).toHaveURL(/\/tour\/complete(?:\?.*)?$/)
    await expect(this.completionHeading).toBeVisible({ timeout: 30000 })
    await expect(this.completionMessage).toBeVisible({ timeout: 30000 })
  }
}
