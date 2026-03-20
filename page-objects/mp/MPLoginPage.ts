import { expect, Locator, Page } from '@playwright/test'
import { getCredentials } from '../../test-environments'
import { AbstractPage } from '../shared/AbstractPage'

type LoginOutcome = 'success' | 'error' | 'disabled'

export class MPLoginPage extends AbstractPage {
  readonly createAccountLink: Locator
  readonly dashboardButton: Locator
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly signInButton: Locator
  readonly errorMessage: Locator
  readonly dashboardGreeting: Locator
  readonly keepMeLoggedInCheckbox: Locator
  readonly requestTourLink: Locator

  constructor(page: Page) {
    super(page)
    this.createAccountLink = page.getByRole('link', { name: 'Create an account' })
    this.dashboardButton = page.getByRole('button', { name: /dashboard/i }).first()
    this.dashboardGreeting = page.getByRole('heading', { name: /Hello .+,/ }).first()
    this.emailInput = page.getByLabel('Email')
    this.passwordInput = page.getByLabel('Password')
    this.signInButton = page.getByRole('button', { name: 'Sign in' })
    this.errorMessage = page.locator('[role="alert"]')
    this.keepMeLoggedInCheckbox = page.getByRole('checkbox', { name: 'Keep me logged in' })
    this.requestTourLink = page.getByRole('link', { name: 'request a tour.' })
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

  async assertLoginFormVisible() {
    await expect(this.emailInput).toBeVisible()
    await expect(this.passwordInput).toBeVisible()
    await expect(this.signInButton).toBeVisible()
  }

  async assertAnonymousEntryPointsVisible(businessName: string) {
    await expect(
      this.page.getByRole('heading', { name: new RegExp(`^Sign in to ${escapeRegExp(businessName)}$`, 'i') }),
    ).toBeVisible()
    await this.assertLoginFormVisible()
    await expect(this.keepMeLoggedInCheckbox).toBeVisible()
    await expect(this.createAccountLink).toBeVisible()
    await expect(this.requestTourLink).toBeVisible()
  }

  async assertLoggedOutFooterVisible(businessName: string) {
    const currentYear = new Date().getFullYear().toString()

    await expect(this.page.getByRole('img', { name: businessName }).first()).toBeVisible()
    await expect(this.page.getByText(new RegExp(`${escapeRegExp(businessName)}.*Copyright © ${currentYear}`, 'i')).first()).toBeVisible()

    for (const legalLink of ['Terms and conditions', 'Privacy policy', 'Cookies policy']) {
      await expect(this.page.getByRole('link', { exact: true, name: legalLink }).first()).toBeVisible()
    }
  }

  async goToMarketingHomeFromBrandLink(businessName: string) {
    await this.page
      .getByRole('navigation')
      .getByRole('link', { name: new RegExp(escapeRegExp(businessName), 'i') })
      .first()
      .click()
  }

  async assertErrorMessage() {
    await expect(this.errorMessage.first()).toBeVisible()
  }

  async assertErrorMessageContains(expectedText: string) {
    await expect(this.errorMessage.first()).toContainText(expectedText)
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

  async getDashboardGreetingName() {
    await expect(this.dashboardGreeting).toBeVisible()

    const greetingText = (await this.dashboardGreeting.innerText()).trim()
    const match = greetingText.match(/^Hello\s+(.+?)(?:,|$)/i)

    return (match?.[1] || '').trim()
  }

  async assertProfileMenuContains(fullName: string) {
    await expect(
      this.page.getByRole('button', { name: new RegExp(escapeRegExp(fullName), 'i') }).first(),
    ).toBeVisible()
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
