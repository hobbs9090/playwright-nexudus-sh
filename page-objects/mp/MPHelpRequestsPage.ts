import { expect, Locator, Page } from '@playwright/test'
import { AbstractPage } from '../shared/AbstractPage'

export type MPHelpRequestDetails = {
  message: string
  subject: string
}

export class MPHelpRequestsPage extends AbstractPage {
  readonly helpRequestsHeading: Locator
  readonly sendRequestLink: Locator
  readonly askForHelpHeading: Locator
  readonly subjectInput: Locator
  readonly messageInput: Locator
  readonly submitRequestButton: Locator
  readonly submissionSuccessDialog: Locator
  readonly successDismissButton: Locator

  constructor(page: Page) {
    super(page)
    this.helpRequestsHeading = page.getByRole('heading', { name: 'Help requests' })
    this.sendRequestLink = page.getByRole('link', { name: /Send request/ })
    this.askForHelpHeading = page.getByRole('heading', { name: /Ask for Help/ })
    this.subjectInput = page.getByRole('textbox', { name: 'Subject' })
    this.messageInput = page.locator('textarea').first()
    this.submitRequestButton = page.getByRole('button', { name: /Submit your Request/ })
    this.submissionSuccessDialog = page.getByRole('dialog').filter({ hasText: 'Thank you for your message.' })
    this.successDismissButton = page.getByRole('button', { name: 'Okay, got it!' })
  }

  async goto() {
    await this.page.goto('/support')
    await expect(this.helpRequestsHeading).toBeVisible({ timeout: 30000 })
  }

  async openNewHelpRequest() {
    await this.goto()
    await this.sendRequestLink.click()
    await expect(this.page).toHaveURL(/\/support\/new(?:\?.*)?$/)
    await expect(this.askForHelpHeading).toBeVisible({ timeout: 30000 })
  }

  async createHelpRequest(details: MPHelpRequestDetails) {
    await this.openNewHelpRequest()
    await this.subjectInput.fill(details.subject)
    await this.messageInput.fill(details.message)
    await this.submitRequestButton.click()

    await expect(this.submissionSuccessDialog).toBeVisible({ timeout: 30000 })
    await this.successDismissButton.click()

    await expect(this.page).toHaveURL(/\/support(?:\?.*)?$/)
    await expect(this.helpRequestsHeading).toBeVisible({ timeout: 30000 })
    await expect(this.page.getByRole('link', { name: new RegExp(details.subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).toBeVisible({
      timeout: 30000,
    })
  }
}
