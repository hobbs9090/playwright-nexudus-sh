import { expect, Locator, Page } from '@playwright/test'
import { getCredentials } from '../../test-environments'
import { AbstractPage } from '../shared/AbstractPage'

type LoginOutcome = 'success' | 'error' | 'disabled'

export class MPLoginPage extends AbstractPage {
  readonly dashboardButton: Locator
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly signInButton: Locator
  readonly errorMessage: Locator
  readonly dashboardGreeting: Locator

  constructor(page: Page) {
    super(page)
    this.dashboardButton = page.getByRole('button', { name: /Dashboard/ }).first()
    this.dashboardGreeting = page.getByRole('heading', { name: /Hello .+,/ }).first()
    this.emailInput = page.getByLabel('Email')
    this.passwordInput = page.getByLabel('Password')
    this.signInButton = page.getByRole('button', { name: 'Sign in' })
    this.errorMessage = page.locator('[role="alert"]')
  }

  async login(email?: string, password?: string, expectedOutcome: LoginOutcome = 'success') {
    await this.page.goto('/login')
    await this.submitCurrentLoginForm(email, password, expectedOutcome)
  }

  async submitCurrentLoginForm(email?: string, password?: string, expectedOutcome: LoginOutcome = 'success') {
    const credentials = getCredentials('NEXUDUS_MP_EMAIL', 'NEXUDUS_MP_PASSWORD')
    const resolvedEmail = email ?? credentials.email
    const resolvedPassword = password ?? credentials.password

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
            const dashboardButtonVisible = await this.dashboardButton.isVisible().catch(() => false)
            const wrongTurnVisible = await this.page
              .getByRole('heading', { name: 'Wrong turn!' })
              .isVisible()
              .catch(() => false)

            return !/\/login(?:\?.*)?$/.test(url) || /\/(?:dashboards\/now|home)(?:\?.*)?$/.test(url) || dashboardButtonVisible || wrongTurnVisible
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

  async assertDashboardVisible(fullName?: string) {
    await expect(this.dashboardButton).toBeVisible()
    await expect(this.dashboardGreeting).toBeVisible()

    if (fullName) {
      const greetingText = (await this.dashboardGreeting.innerText()).trim()
      const candidateNames = [fullName, fullName.split(/\s+/)[0] || ''].filter(Boolean)

      expect(
        candidateNames.some((candidateName) => greetingText.includes(candidateName)),
        `Expected the dashboard greeting to include one of: ${candidateNames.join(', ')}.`,
      ).toBeTruthy()
    }
  }
}
