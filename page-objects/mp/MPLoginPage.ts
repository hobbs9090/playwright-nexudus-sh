import { expect, Locator, Page } from '@playwright/test'
import { getCredentials } from '../../test-environments'
import { AbstractPage } from '../shared/AbstractPage'

export class MPLoginPage extends AbstractPage {
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly signInButton: Locator

  constructor(page: Page) {
    super(page)
    this.emailInput = page.getByLabel('Email')
    this.passwordInput = page.getByLabel('Password')
    this.signInButton = page.getByRole('button', { name: 'Sign in' })
  }

  async login(email?: string, password?: string) {
    const credentials = getCredentials('NEXUDUS_MP_EMAIL', 'NEXUDUS_MP_PASSWORD')
    const resolvedEmail = email ?? credentials.email
    const resolvedPassword = password ?? credentials.password

    await this.page.goto('/login')
    await this.emailInput.fill(resolvedEmail)
    await this.passwordInput.fill(resolvedPassword)
    await this.signInButton.click()
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
        { timeout: 30000 }
      )
      .toBe(true)
  }

  async assertDashboardVisible() {
    await expect(this.page.getByRole('button', { name: /Dashboard/ }).first()).toBeVisible()
    await expect(this.page.getByRole('heading', { name: /Hello .+,/ }).first()).toBeVisible()
  }
}
