import { expect, Locator, Page } from '@playwright/test'
import { AbstractPage } from '../shared/AbstractPage'

export class ProductPage extends AbstractPage {
  // Define selectors
  readonly productCountLink: Locator
  readonly searchInput: Locator
  readonly addProductButton: Locator
  readonly manualEntryButton: Locator
  readonly productNameInput: Locator
  readonly productDescriptionInput: Locator
  readonly unitPriceInput: Locator
  readonly taxRateInput: Locator
  readonly taxRateOptions: Locator
  readonly saveChangesButton: Locator
  readonly deleteProductButton: Locator
  readonly deleteConfirmationInput: Locator
  readonly confirmDeleteButton: Locator
  readonly showAllLocationsButton: Locator

  // Init selectors using constructor
  constructor(page: Page) {
    super(page)
    this.productCountLink = page.getByRole('link', { name: /^\d+ products?$/ }).first()
    this.searchInput = page.getByPlaceholder('Search...')
    this.addProductButton = page.getByRole('button', { name: 'Add product' })
    this.manualEntryButton = page.getByRole('button', { name: 'Manual Entry' })
    this.productNameInput = page.getByLabel('Product name')
    this.productDescriptionInput = page.getByLabel('Product description')
    this.unitPriceInput = page.getByLabel('Unit price')
    this.taxRateInput = page.getByLabel('Tax rate')
    this.taxRateOptions = page.locator('[role="listbox"]').getByRole('option')
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

  async getProductCount() {
    const countText = (await this.productCountLink.textContent()) || ''
    const match = countText.match(/(\d+)\s+products?/i)

    if (!match) {
      throw new Error(`Could not determine product count from text: '${countText}'`)
    }

    return Number(match[1])
  }

  async refreshProductCount() {
    await this.navigateTo()
    return this.getProductCount()
  }

  async addProduct(product_name: string) {
    const productDescription = `A short description of test product called '${product_name}'.`

    await this.dismissBlockingDialogs()
    await this.addProductButton.click()
    await this.manualEntryButton.click()
    await this.productNameInput.fill(product_name)
    await this.productDescriptionInput.fill(productDescription)
    await this.productDescriptionInput.press('Tab')
    await this.unitPriceInput.fill('4.99')
    await this.unitPriceInput.press('Tab')
    await this.selectFirstAvailableTaxRate()
    await this.page.route(
      '**/api/billing/products',
      async (route) => {
        const request = route.request()

        if (request.method() !== 'POST') {
          await route.continue()
          return
        }

        const payload = request.postDataJSON()
        await route.continue({
          postData: JSON.stringify({
            ...payload,
            Description: payload.Description || productDescription,
          }),
        })
      },
      { times: 1 }
    )
    const createResponsePromise = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' && /\/api\/billing\/products$/.test(new URL(response.url()).pathname),
      { timeout: 30000 }
    )
    await this.saveChangesButton.click()
    const createResponse = await createResponsePromise
    const createResponseBody = await createResponse.json()

    if (!createResponseBody.WasSuccessful || !createResponseBody.Value?.Id) {
      throw new Error(`Product creation did not return a usable id: ${JSON.stringify(createResponseBody)}`)
    }

    return createResponseBody.Value.Id
  }

  async selectFirstAvailableTaxRate() {
    const taxRateInputVisible = await this.taxRateInput.isVisible().catch(() => false)

    if (!taxRateInputVisible) {
      return
    }

    await this.taxRateInput.click()
    const firstTaxRateOption = this.taxRateOptions.first()
    await expect(firstTaxRateOption).toBeVisible({ timeout: 15000 })

    try {
      await firstTaxRateOption.click()
    } catch {
      await this.taxRateInput.press('ArrowDown')
      await this.taxRateInput.press('Enter')
    }

    await expect(this.taxRateInput).not.toHaveValue('', { timeout: 15000 })
  }

  async deleteProduct(productId: number) {
    await this.dismissBlockingDialogs()
    await this.page.goto(`/billing/products/${productId}`)
    await this.dismissBlockingDialogs()
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

  async searchForProduct(product_name: string) {
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
    return await this.page.getByRole('link', { name: product_name }).isVisible().catch(() => false)
  }
}
