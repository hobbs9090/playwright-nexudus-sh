import { basename } from 'node:path'
import { expect, Locator, Page } from '@playwright/test'
import { AbstractPage } from '../shared/AbstractPage'

type DeliveryRecord = {
  customerName: string
  deliveryType: number
  fileDataFileName: string | null
  id: number
  reference: string
}

type CollectedDeliveryRecord = {
  collected: boolean
}

export class DeliveryPage extends AbstractPage {
  readonly collectionSignatureInput: Locator
  readonly markAsCollectedButton: Locator
  readonly deleteConfirmationInput: Locator
  readonly deliveryTypeSelect: Locator
  readonly formDialog: Locator
  readonly manualEntryButton: Locator
  readonly receivedByInput: Locator
  readonly registerDeliveryButton: Locator
  readonly saveChangesButton: Locator
  readonly deliveryLabelInput: Locator
  readonly searchCustomerInput: Locator
  readonly deleteButton: Locator
  readonly confirmDeleteButton: Locator

  constructor(page: Page) {
    super(page)
    this.formDialog = page.locator('[role="dialog"]').filter({ hasText: 'Delivery details' }).first()
    this.collectionSignatureInput = this.formDialog.locator('#image-field-Signature')
    this.markAsCollectedButton = this.formDialog.getByRole('button', { name: 'Mark as collected' })
    this.registerDeliveryButton = page.getByRole('button', { name: 'Register delivery' })
    this.manualEntryButton = this.formDialog.getByRole('button', { name: 'Type details manually' })
    this.deliveryTypeSelect = this.formDialog.getByLabel('Delivery type')
    this.searchCustomerInput = this.formDialog.getByRole('combobox', {
      name: 'Type to search for company or individual',
    })
    this.receivedByInput = this.formDialog.getByLabel('Received by')
    this.saveChangesButton = this.formDialog.getByRole('button', { name: 'Save changes' })
    this.deliveryLabelInput = this.formDialog.locator('input[type="file"][name="file"]').first()
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

  async registerDeliveryForCustomer(
    customerName: string,
    deliveryType: 'Mail' | 'Parcel' | 'Checks' | 'Publicity' = 'Parcel',
    deliveryLabelPath?: string
  ) {
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

    if (deliveryLabelPath) {
      const uploadedFileName = basename(deliveryLabelPath)
      await this.deliveryLabelInput.setInputFiles(deliveryLabelPath)
      await expect(this.formDialog).toContainText(uploadedFileName, { timeout: 15000 })
    }

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

    if (deliveryLabelPath && createResponseBody.Value.FileDataFileName !== basename(deliveryLabelPath)) {
      throw new Error(
        `Delivery label upload was not preserved: ${JSON.stringify({
          expected: basename(deliveryLabelPath),
          actual: createResponseBody.Value.FileDataFileName,
        })}`
      )
    }

    return {
      customerName: createResponseBody.Value.CoworkerFullName,
      deliveryType: createResponseBody.Value.DeliveryType,
      fileDataFileName: createResponseBody.Value.FileDataFileName,
      id: createResponseBody.Value.Id,
      reference: createResponseBody.Value.Name,
    } satisfies DeliveryRecord
  }

  async uploadCollectionSignature(signaturePath: string) {
    const uploadedFileName = basename(signaturePath)
    await this.collectionSignatureInput.setInputFiles(signaturePath)
    await expect(this.formDialog).toContainText(uploadedFileName, { timeout: 15000 })
  }

  async markCurrentDeliveryAsCollected() {
    const updateResponsePromise = this.page.waitForResponse(
      (response) => response.request().method() === 'PUT' && /\/api\/spaces\/coworkerDeliveries$/.test(response.url()),
      { timeout: 30000 }
    )
    const runCommandResponsePromise = this.page.waitForResponse(
      (response) => response.request().method() === 'POST' && /\/api\/spaces\/coworkerDeliveries\/runCommand$/.test(response.url()),
      { timeout: 30000 }
    )

    await this.markAsCollectedButton.click()

    const updateResponseBody = await (await updateResponsePromise).json()
    const runCommandResponseBody = await (await runCommandResponsePromise).json()

    if (!updateResponseBody.WasSuccessful) {
      throw new Error(`Delivery collect update failed: ${JSON.stringify(updateResponseBody)}`)
    }

    if (!runCommandResponseBody.WasSuccessful) {
      throw new Error(`Delivery collect command failed: ${JSON.stringify(runCommandResponseBody)}`)
    }

    return {
      collected: true,
    } satisfies CollectedDeliveryRecord
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

  async isPendingDeliveryVisible(reference: string) {
    await this.navigateToList()
    return this.page.getByText(reference, { exact: true }).isVisible().catch(() => false)
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
