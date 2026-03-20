import { expect, Locator, Page } from '@playwright/test'
import { AbstractPage } from '../shared/AbstractPage'

export class MPPortalPage extends AbstractPage {
  readonly main: Locator
  readonly maybeLaterButton: Locator
  readonly sidebar: Locator

  constructor(page: Page) {
    super(page)
    this.main = page.getByRole('main')
    this.maybeLaterButton = page.getByRole('button', { name: 'Maybe later' })
    this.sidebar = page.getByRole('complementary')
  }

  async dismissOnboardingModalIfPresent() {
    for (let attempt = 0; attempt < 3; attempt++) {
      const modalVisible = await this.maybeLaterButton.isVisible().catch(() => false)

      if (modalVisible) {
        await this.maybeLaterButton.click()
        await this.page.waitForTimeout(300)
        continue
      }

      await this.maybeLaterButton.waitFor({ state: 'visible', timeout: 1000 }).catch(() => {})

      if (!(await this.maybeLaterButton.isVisible().catch(() => false))) {
        break
      }
    }
  }

  async openProfileMenu(fullName: string) {
    await this.dismissOnboardingModalIfPresent()

    const profileMenuButton = this.page
      .getByRole('button', { name: new RegExp(escapeRegExp(fullName), 'i') })
      .first()

    await expect(profileMenuButton).toBeVisible()
    await profileMenuButton.click()
  }

  async assertProfileMenuEntryVisible(label: string) {
    await expect(await this.getVisibleControl(this.page, label)).toBeVisible()
  }

  async assertProfileMenuEntryNotVisible(label: string) {
    const visible = await this.hasVisibleControl(this.page, label)
    expect(visible, `Expected not to find a visible profile-menu entry named "${label}".`).toBe(false)
  }

  async clickProfileMenuEntry(fullName: string, label: string) {
    await this.openProfileMenu(fullName)
    await (await this.getVisibleControl(this.page, label)).click()
    await this.dismissOnboardingModalIfPresent()
  }

  async clickSidebarItem(label: string) {
    await this.dismissOnboardingModalIfPresent()
    await (await this.getVisibleControl(this.sidebar, label)).click()
    await this.dismissOnboardingModalIfPresent()
  }

  async assertSidebarItemVisible(label: string) {
    await expect(await this.getVisibleControl(this.sidebar, label)).toBeVisible()
  }

  async assertSidebarItemNotVisible(label: string) {
    const visible = await this.hasVisibleControl(this.sidebar, label)
    expect(visible, `Expected not to find a visible sidebar item named "${label}".`).toBe(false)
  }

  async clickMainItem(label: string) {
    await (await this.getVisibleControl(this.main, label)).click()
    await this.dismissOnboardingModalIfPresent()
  }

  async assertMainHeadingVisible(label: string) {
    await expect(this.main.getByRole('heading', { name: new RegExp(escapeRegExp(label), 'i') }).first()).toBeVisible()
  }

  async assertMainTextVisible(label: string) {
    await expect(this.main.getByText(label, { exact: true }).first()).toBeVisible()
  }

  async assertMainTextNotVisible(label: string) {
    const visible = await this.main
      .getByText(label, { exact: true })
      .first()
      .isVisible()
      .catch(() => false)

    expect(visible, `Expected not to find "${label}" in the main content area.`).toBe(false)
  }

  async assertMainControlVisible(label: string) {
    await expect(await this.getVisibleControl(this.main, label)).toBeVisible()
  }

  async hasMainControl(label: string) {
    return this.hasVisibleControl(this.main, label)
  }

  private async getVisibleControl(container: Locator, label: string) {
    const roleNamePattern = new RegExp(`\\b${escapeRegExp(label)}\\b`, 'i')
    const candidates = [
      container.getByRole('link', { name: roleNamePattern }).first(),
      container.getByRole('button', { name: roleNamePattern }).first(),
      container.getByRole('heading', { name: roleNamePattern }).first(),
      container.getByText(label, { exact: true }).first(),
    ]

    for (const candidate of candidates) {
      if (await candidate.isVisible().catch(() => false)) {
        return candidate
      }
    }

    throw new Error(`Could not find a visible control named "${label}".`)
  }

  private async hasVisibleControl(container: Locator, label: string) {
    const roleNamePattern = new RegExp(`\\b${escapeRegExp(label)}\\b`, 'i')
    const candidates = [
      container.getByRole('link', { name: roleNamePattern }).first(),
      container.getByRole('button', { name: roleNamePattern }).first(),
      container.getByRole('heading', { name: roleNamePattern }).first(),
      container.getByText(label, { exact: true }).first(),
    ]

    for (const candidate of candidates) {
      if (await candidate.isVisible().catch(() => false)) {
        return true
      }
    }

    return false
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
