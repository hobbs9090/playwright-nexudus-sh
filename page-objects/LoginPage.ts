import { expect, Locator, Page } from '@playwright/test'
import { AbstractPage } from './AbstractPage'

export class LoginPage extends AbstractPage {
  // Define selectors
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly signInButton: Locator
  readonly errorMessage: Locator

  // Init selectors using constructor
  constructor(page: Page) {
    super(page)
    this.emailInput = page.getByLabel('Email')
    this.passwordInput = page.getByLabel('Password')
    this.signInButton = page.getByRole('button', { name: 'Sign in' })
    this.errorMessage = page.locator('.euiText')
  }

  // Define login page methods
  async login(
    email: string = process.env.NEXUDUS_EMAIL || 'harry.potter@example.net',
    password: string = process.env.NEXUDUS_PASSWORD || 'Demo1234!!',
    valid: boolean = true
  ) {
    await this.page.goto('')
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.signInButton.click()
    if (valid) {
      await this.page.waitForURL('**/dashboards/now', { timeout: 30000 })
    } else {
      await this.assertErrorMessage('The email or password is incorrect.')
    }
  }

  async assertErrorMessage(errorMessage: string) {
    await expect(this.errorMessage.nth(0)).toContainText(errorMessage)
    await expect(this.errorMessage.nth(0)).toBeVisible()
  }
}
