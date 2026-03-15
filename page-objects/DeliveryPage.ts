import { expect, Locator, Page } from '@playwright/test'
import { AbstractPage } from './AbstractPage'

type DeliveryRecord = {
  customerName: string
  deliveryType: number
  id: number
  reference: string
}

export class DeliveryPage extends AbstractPage {
  readonly deleteConfirmationInput: Locator
  readonly deliveryTypeSelect: Locator
  readonly formDialog: Locator
  readonly manualEntryButton: Locator
  readonly receivedByInput: Locator
  readonly registerDeliveryButton: Locator
  readonly saveChangesButton: Locator
  readonly searchCustomerInput: Locator
  readonly deleteButton: Locator
  readonly confirmDeleteButton: Locator

  constructor(page: Page) {
    super(page)
    this.formDialog = page.locator('[role="dialog"]').filter({ hasText: 'Delivery details' }).first()
    this.registerDeliveryButton = page.getByRole('button', { name: 'Register delivery' })
    this.manualEntryButton = this.formDialog.getByRole('button', { name: 'Type details manually' })
    this.deliveryTypeSelect = this.formDialog.getByLabel('Delivery type')
    this.searchCustomerInput = this.formDialog.getByRole('combobox', {
      name: 'Type to search for company or individual',
    })
    this.receivedByInput = this.formDialog.getByLabel('Received by')
    this.saveChangesButton = this.formDialog.getByRole('button', { name: 'Save changes' })
    this.deleteButton = page.getByRole('button', { name: 'Delete' })
    this.deleteConfirmationInput = page.getByPlaceholder("Type 'DELETE' to continue")
    this.confirmDeleteButton = page.getByRole('button', { name: 'Yes, do it' })
  }

  async navigateToList() {
    await this.page.goto('/operations/coworkerDeliveries')
    await this.dismissBlockingDialogs()
  }

  async openDeliveryDetails(id: number) {
    await this.page.goto(`/operations/coworkerDeliveries/${id}`)
    await this.dismissBlockingDialogs()
    await expect(this.formDialog).toContainText('Delivery details')
  }

  async registerDeliveryForCustomer(customerName: string, deliveryType: 'Mail' | 'Parcel' | 'Checks' | 'Publicity' = 'Parcel') {
    await this.navigateToList()
    await this.registerDeliveryButton.click()
    await expect(this.formDialog).toContainText('Delivery details')
    await this.manualEntryButton.click()
    await expect(this.deliveryTypeSelect).toBeVisible()
    await this.deliveryTypeSelect.selectOption({ label: deliveryType })
    await this.searchCustomerInput.click()
    await this.searchCustomerInput.fill(customerName)

    const customerOption = this.page.getByRole('option', { name: new RegExp(customerName, 'i') }).first()
    await expect(customerOption).toBeVisible({ timeout: 15000 })
    await customerOption.click()

    await expect(this.formDialog).toContainText(customerName)

    const createResponsePromise = this.page.waitForResponse(
      (response) => response.request().method() === 'POST' && /\/api\/spaces\/coworkerDeliveries$/.test(response.url()),
      { timeout: 30000 }
    )

    await this.saveChangesButton.click()
    const createResponse = await createResponsePromise
    const createResponseBody = await createResponse.json()

    if (!createResponseBody.WasSuccessful || !createResponseBody.Value?.Id) {
      throw new Error(`Delivery creation did not return a usable record: ${JSON.stringify(createResponseBody)}`)
    }

    return {
      customerName: createResponseBody.Value.CoworkerFullName,
      deliveryType: createResponseBody.Value.DeliveryType,
      id: createResponseBody.Value.Id,
      reference: createResponseBody.Value.Name,
    } satisfies DeliveryRecord
  }

  async assertAssignedCustomer(customerName: string) {
    await expect(this.formDialog).toContainText(customerName)
  }

  async assertDeliveryType(value: string) {
    await expect(this.deliveryTypeSelect).toHaveValue(value)
  }

  async assertReceivedByCurrentUser() {
    await expect(this.receivedByInput).toHaveValue(/Harry Potter/i)
  }

  async deleteDelivery(id: number) {
    await this.openDeliveryDetails(id)

    const deleteResponsePromise = this.page.waitForResponse(
      (response) => response.request().method() === 'DELETE' && new RegExp(`/api/spaces/coworkerDeliveries/${id}$`).test(response.url()),
      { timeout: 30000 }
    )

    await this.deleteButton.click()
    await this.deleteConfirmationInput.fill('DELETE')
    await this.confirmDeleteButton.click()

    const deleteResponse = await deleteResponsePromise
    const deleteResponseBody = await deleteResponse.json()

    if (!deleteResponseBody.WasSuccessful) {
      throw new Error(`Delivery deletion failed: ${JSON.stringify(deleteResponseBody)}`)
    }

    await this.page.waitForSelector(
      '[data-test-subj="euiToastHeader__title"]:has-text("Deleting records in the background")'
    )
    await this.page.waitForSelector(
      '[data-test-subj="euiToastHeader__title"]:has-text("Deleting records in the background")',
      { state: 'detached' }
    )
    await expect(this.page).toHaveURL(/\/operations\/coworkerDeliveries(\?|$)/)
  }
}
