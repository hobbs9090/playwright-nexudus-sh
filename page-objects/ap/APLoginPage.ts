import { expect, Locator, Page } from '@playwright/test'
import { getConfiguredLocationSelectorLabel, getCredentials } from '../../test-environments'
import { AbstractPage } from '../shared/AbstractPage'

export class APLoginPage extends AbstractPage {
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly signInButton: Locator
  readonly errorMessage: Locator
  readonly dashboardLink: Locator
  readonly globalSearchInput: Locator
  readonly locationMenu: Locator

  constructor(page: Page) {
    super(page)
    this.emailInput = page.getByLabel('Email')
    this.passwordInput = page.getByLabel('Password')
    this.signInButton = page.getByRole('button', { name: 'Sign in' })
    this.errorMessage = page.locator('.euiText')
    this.dashboardLink = page.getByRole('link', { name: 'Dashboard' }).first()
    this.globalSearchInput = page.getByRole('textbox', { name: /Search everywhere for/i })
    this.locationMenu = page.locator('[aria-label="Locations menu"]').first()
  }

  async login(email?: string, password?: string, valid: boolean = true, startURL: string = '') {
    const credentials = getCredentials('NEXUDUS_AP_EMAIL', 'NEXUDUS_AP_PASSWORD')
    const resolvedEmail = email ?? credentials.email
    const resolvedPassword = password ?? credentials.password

    await this.installBlockingDialogSuppression()
    await this.page.goto(startURL)
    await this.emailInput.fill(resolvedEmail)
    await this.passwordInput.fill(resolvedPassword)
    await this.signInButton.click()

    if (valid) {
      await expect
        .poll(
          async () => {
            const url = this.page.url()
            const dashboardLinkVisible = await this.dashboardLink.isVisible().catch(() => false)
            const globalSearchVisible = await this.globalSearchInput.isVisible().catch(() => false)

            return /\/(?:dashboards\/now|home)?(?:\?.*)?$/.test(url) || dashboardLinkVisible || globalSearchVisible
          },
          { timeout: 30000 }
        )
        .toBe(true)
      await this.ensureConfiguredLocationSelected()
      return
    }

    await this.assertErrorMessage('The email or password is incorrect.')
  }

  async assertErrorMessage(errorMessage: string) {
    await expect(this.errorMessage.nth(0)).toContainText(errorMessage)
    await expect(this.errorMessage.nth(0)).toBeVisible()
  }

  async assertDashboardVisible() {
    await expect(this.dashboardLink).toBeVisible()
    await expect(this.globalSearchInput).toBeVisible()
  }

  async ensureConfiguredLocationSelected(locationLabel: string = getConfiguredLocationSelectorLabel('ap')) {
    await expect(this.locationMenu).toBeVisible()

    if ((await this.locationMenu.innerText()).trim() === locationLabel) {
      return
    }

    await this.dismissBlockingDialogs()
    await this.locationMenu.dispatchEvent('click')

    const targetLocationOption = this.page.getByRole('option').filter({ hasText: locationLabel }).first()

    await expect(targetLocationOption).toBeVisible({ timeout: 10000 })
    await targetLocationOption.dispatchEvent('click')
    await expect(this.locationMenu).toContainText(locationLabel, { timeout: 30000 })
  }
}
