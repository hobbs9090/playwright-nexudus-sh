import { expect, Locator, Page } from '@playwright/test'
import { AbstractPage } from './AbstractPage'

export class ProductPage extends AbstractPage {
  // Define selectors
  readonly searchInput: Locator
  readonly addProductButton: Locator
  readonly manualEntryButton: Locator
  readonly productNameInput: Locator
  readonly productDescriptionInput: Locator
  readonly unitPriceInput: Locator
  readonly taxRateInput: Locator
  readonly saveChangesButton: Locator
  readonly deleteProductButton: Locator
  readonly deleteConfirmationInput: Locator
  readonly confirmDeleteButton: Locator
  readonly showAllLocationsButton: Locator

  // Init selectors using constructor
  constructor(page: Page) {
    super(page)
    this.searchInput = page.getByPlaceholder('Search...')
    this.addProductButton = page.getByRole('button', { name: 'Add product' })
    this.manualEntryButton = page.getByRole('button', { name: 'Manual Entry' })
    this.productNameInput = page.getByLabel('Product name')
    this.productDescriptionInput = page.getByLabel('Product description')
    this.unitPriceInput = page.getByLabel('Unit price')
    this.taxRateInput = page.getByLabel('Tax rate')
    this.saveChangesButton = page.getByRole('button', { name: 'Save changes' })
    this.deleteProductButton = page.getByRole('button', { name: 'Delete' })
    this.deleteConfirmationInput = page.getByPlaceholder("Type 'DELETE' to continue")
    this.confirmDeleteButton = page.getByRole('button', { name: 'Yes, do it' })
    this.showAllLocationsButton = page.getByRole('button', { name: 'Show data for all locations' })
  }

  // Define login page methods
  async navigateTo() {
    await this.page.goto('/billing/products')
    await this.dismissBlockingDialogs()
  }

  async addProduct(product_name: string) {
    await this.dismissBlockingDialogs()
    await this.addProductButton.click()
    await this.manualEntryButton.click()
    await this.productNameInput.fill(product_name)
    await this.productDescriptionInput.fill(`A short description of test product called '${product_name}'.`)
    await this.productDescriptionInput.press('Tab')
    await this.unitPriceInput.fill('4.99')
    await this.unitPriceInput.press('Tab')
    await this.taxRateInput.click()
    await this.page.locator('text=/VAT \\([0-9]+%\\)/').first().click()
    await expect(this.taxRateInput).not.toHaveValue('')
    await this.wait(2000) // ToDo - replace with a better wait
    await this.saveChangesButton.click()
  }

  async deleteProduct(product_name: string) {
    await this.dismissBlockingDialogs()
    await this.searchForProduct(product_name)
    await this.page.getByRole('link', { name: product_name }).click()
    await this.deleteProductButton.click()
    await this.deleteConfirmationInput.fill('DELETE')
    await this.confirmDeleteButton.click()
    await this.page.waitForSelector(
      '[data-test-subj="euiToastHeader__title"]:has-text("Deleting records in the background")'
    )
    // Wait for the "deleting" message to disappear
    await this.page.waitForSelector(
      '[data-test-subj="euiToastHeader__title"]:has-text("Deleting records in the background")',
      { state: 'detached' }
    )
  }

  async searchForProduct(product_name: string, timeoutMs: number = 15000) {
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
      await this.page.goto('/billing/products')
      await this.dismissBlockingDialogs()
      await this.searchInput.fill(product_name)
      await this.searchInput.press('ArrowDown')
      await this.searchInput.press('Enter')
      await this.wait(1000)
      await this.dismissBlockingDialogs()
      if (await this.showAllLocationsButton.isVisible().catch(() => false)) {
        await this.showAllLocationsButton.click()
        await this.wait(1000)
      }
      await this.dismissBlockingDialogs()
      await this.wait(1000) // ToDo - replace with a better wait
      if (await this.showAllLocationsButton.isVisible().catch(() => false)) {
        await this.showAllLocationsButton.click()
        await this.wait(1000)
      }
      await this.searchInput.press('Escape').catch(() => {})
      if (await this.page.getByRole('link', { name: product_name }).isVisible().catch(() => false)) {
        return true
      }
      await this.wait(2000)
    }

    return false
  }
}
