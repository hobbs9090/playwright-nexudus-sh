import { expect, Locator, Page } from '@playwright/test'
import { AbstractPage } from '../shared/AbstractPage'

export class MPTourPage extends AbstractPage {
  readonly requestTourLink: Locator
  readonly requestTourHeading: Locator
  readonly fullNameInput: Locator
  readonly emailInput: Locator
  readonly phoneNumberInput: Locator
  readonly requestTourButton: Locator
  readonly validationDialog: Locator
  readonly validationDismissButton: Locator

  constructor(page: Page) {
    super(page)
    this.requestTourLink = page.getByRole('link', { name: /request a tour/i })
    this.requestTourHeading = page.getByRole('heading', { name: /Request a tour/ })
    this.fullNameInput = page.getByRole('textbox', { name: 'Full name*' })
    this.emailInput = page.getByRole('textbox', { name: 'Email*' })
    this.phoneNumberInput = page.getByRole('textbox', { name: 'Phone number*' })
    this.requestTourButton = page.getByRole('button', { name: /Request a tour/ })
    this.validationDialog = page.getByRole('dialog').filter({ hasText: 'Sorry, this page could not be loaded' })
    this.validationDismissButton = page.getByRole('button', { name: 'Okay, got it!' })
  }

  async openFromLogin() {
    await this.page.goto('/login')
    await this.requestTourLink.click()
    await expect(this.page).toHaveURL(/\/tour(?:\?.*)?$/)
    await expect(this.requestTourHeading).toBeVisible({ timeout: 30000 })
  }

  async submitEmptyRequest() {
    await this.requestTourButton.click()
  }

  async assertRequiredFieldValidationVisible() {
    await expect(this.validationDialog).toBeVisible({ timeout: 30000 })
    await expect(this.validationDialog).toContainText('Full name is required')
    await expect(this.validationDialog).toContainText('Email is required')
    await expect(this.validationDialog).toContainText('This email address does not seem to be valid.')
  }

  async dismissValidationDialog() {
    await this.validationDismissButton.click()
    await expect(this.validationDialog).not.toBeVisible({ timeout: 30000 })
  }
}
