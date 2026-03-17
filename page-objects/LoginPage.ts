import { expect, Locator, Page, test } from '@playwright/test'
import { AbstractPage } from './AbstractPage'
import { getCredentialsForProject, getEnvironmentForProject } from '../test-environments'

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
    email?: string,
    password?: string,
    valid: boolean = true
  ) {
    const environment = getEnvironmentForProject(test.info().project.name)
    const credentials = getCredentialsForProject(test.info().project.name)
    const resolvedEmail = email ?? credentials.email
    const resolvedPassword = password ?? credentials.password

    await this.installBlockingDialogSuppression()
    await this.page.goto(environment.loginPath)
    await this.emailInput.fill(resolvedEmail)
    await this.passwordInput.fill(resolvedPassword)
    await this.signInButton.click()
    if (valid) {
      await this.page.waitForURL(environment.successUrlPattern, { timeout: 30000 })
    } else {
      await this.assertErrorMessage('The email or password is incorrect.')
    }
  }

  async assertErrorMessage(errorMessage: string) {
    await expect(this.errorMessage.nth(0)).toContainText(errorMessage)
    await expect(this.errorMessage.nth(0)).toBeVisible()
  }
}
