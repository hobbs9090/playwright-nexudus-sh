import { expect, Locator, Page } from '@playwright/test'
import { AbstractPage } from '../shared/AbstractPage'

export type MPHelpRequestInput = {
  message: string
  subject: string
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export class MPHelpRequestsPage extends AbstractPage {
  readonly askForHelpHeading: Locator
  readonly helpRequestStatus: Locator
  readonly helpRequestsHeading: Locator
  readonly messageInput: Locator
  readonly sendRequestLink: Locator
  readonly submissionDialog: Locator
  readonly submissionDialogConfirmButton: Locator
  readonly subjectInput: Locator
  readonly submitRequestButton: Locator
  readonly virtualOfficeMaybeLaterButton: Locator

  constructor(page: Page) {
    super(page)
    this.askForHelpHeading = page.getByRole('heading', { name: 'Ask for Help' })
    this.helpRequestStatus = page.locator('main').getByText('Open', { exact: true }).first()
    this.helpRequestsHeading = page.getByRole('heading', { name: 'Help requests' })
    this.messageInput = page.getByPlaceholder(
      "I'm having trouble with my login. Every time I try to sign in, I get an error.",
    )
    this.sendRequestLink = page.getByRole('link', { name: /Send request/i })
    this.submissionDialog = page.locator('[role="dialog"]').filter({ hasText: 'Thank you for your message.' }).first()
    this.submissionDialogConfirmButton = this.submissionDialog.getByRole('button', { name: 'Okay, got it!' })
    this.subjectInput = page.getByRole('textbox', { name: 'Subject' })
    this.submitRequestButton = page.getByRole('button', { name: /Submit your Request/i })
    this.virtualOfficeMaybeLaterButton = page.getByRole('button', { name: 'Maybe later' })
  }

  async gotoList() {
    await this.page.goto('/support')
    await this.dismissBlockingDialogs()
    await this.dismissVirtualOfficePreferencesIfPresent()
    await expect(this.helpRequestsHeading).toBeVisible()
  }

  async dismissVirtualOfficePreferencesIfPresent() {
    const maybeLaterVisible = await this.virtualOfficeMaybeLaterButton.isVisible().catch(() => false)

    if (maybeLaterVisible) {
      await this.virtualOfficeMaybeLaterButton.click()
      return
    }

    await this.virtualOfficeMaybeLaterButton
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(async () => {
        await this.virtualOfficeMaybeLaterButton.click()
      })
      .catch(() => {})
  }

  async openNewHelpRequestForm() {
    await this.sendRequestLink.click()
    await expect(this.askForHelpHeading).toBeVisible()
  }

  async submitHelpRequest(request: MPHelpRequestInput) {
    await this.subjectInput.fill(request.subject)
    await this.messageInput.fill(request.message)
    await this.submitRequestButton.click()

    await expect(this.submissionDialog).toContainText('Thank you for your message.')
    await this.submissionDialogConfirmButton.click()
    await expect(this.page).toHaveURL(/\/support(?:\?.*)?$/)
    await expect(this.helpRequestsHeading).toBeVisible()
  }

  async assertHelpRequestListed(subject: string) {
    const requestListItem = this.getRequestListItem(subject)

    await expect(requestListItem).toBeVisible()
    await expect(requestListItem).toContainText('Open')
  }

  async openHelpRequest(subject: string) {
    await this.getRequestListItem(subject).click()
    await expect(this.page).toHaveURL(/\/support\/\d+(?:\?.*)?$/)
  }

  async assertHelpRequestDetails(request: MPHelpRequestInput) {
    await expect(this.page.getByRole('heading', { name: request.subject })).toBeVisible()
    await expect(this.page.getByText(request.message, { exact: true })).toBeVisible()
    await expect(this.helpRequestStatus).toBeVisible()
  }

  private getRequestListItem(subject: string) {
    return this.page.getByRole('link', { name: new RegExp(escapeRegExp(subject), 'i') }).first()
  }
}
