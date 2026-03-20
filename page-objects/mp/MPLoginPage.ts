import { expect, Locator, Page } from '@playwright/test'
import { getCredentials } from '../../test-environments'
import { AbstractPage } from '../shared/AbstractPage'

type LoginOutcome = 'success' | 'error' | 'disabled'

export class MPLoginPage extends AbstractPage {
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly signInButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    super(page)
    this.emailInput = page.getByLabel('Email')
    this.passwordInput = page.getByLabel('Password')
    this.signInButton = page.getByRole('button', { name: 'Sign in' })
    this.errorMessage = page.locator('[role="alert"]')
  }

  async login(email?: string, password?: string, expectedOutcome: LoginOutcome = 'success') {
    const credentials = getCredentials('NEXUDUS_MP_EMAIL', 'NEXUDUS_MP_PASSWORD')
    const resolvedEmail = email ?? credentials.email
    const resolvedPassword = password ?? credentials.password

    await this.page.goto('/login')

    if (resolvedEmail !== '') {
      await this.emailInput.fill(resolvedEmail)
    }
    if (resolvedPassword !== '') {
      await this.passwordInput.fill(resolvedPassword)
    }

    if (expectedOutcome === 'disabled') {
      await this.assertSignInDisabled()
      return
    }

    await this.signInButton.click()

    if (expectedOutcome === 'success') {
      await expect
        .poll(
          async () => {
            const url = this.page.url()
            const dashboardButtonVisible = await this.page
              .getByRole('button', { name: /Dashboard/ })
              .first()
              .isVisible()
              .catch(() => false)

            return /\/(?:dashboards\/now|home)(?:\?.*)?$/.test(url) || dashboardButtonVisible
          },
          { timeout: 30000 },
        )
        .toBe(true)
      return
    }

    await this.assertErrorMessage()
  }

  async assertErrorMessage() {
    await expect(this.errorMessage.first()).toBeVisible()
  }

  async assertSignInDisabled() {
    await expect(this.signInButton).toBeDisabled()
  }

  async assertDashboardVisible() {
    await expect(this.page.getByRole('button', { name: /Dashboard/ }).first()).toBeVisible()
    await expect(this.page.getByRole('heading', { name: /Hello .+,/ }).first()).toBeVisible()
  }
}
