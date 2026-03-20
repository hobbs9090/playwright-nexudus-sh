import { expect, Locator, Page } from '@playwright/test'
import { AbstractPage } from '../shared/AbstractPage'

export class MPBookingsPage extends AbstractPage {
  readonly allResourcesButton: Locator

  constructor(page: Page) {
    super(page)
    this.allResourcesButton = page.getByRole('button', { name: 'All Resources' })
  }

  async goto(pathOrUrl: string = '/bookings') {
    return await this.page.goto(pathOrUrl)
  }

  async assertLoaded() {
    await expect(this.page).toHaveURL(/\/bookings(?:\?.*)?$/)
    await expect(this.allResourcesButton).toBeVisible()
  }
}
