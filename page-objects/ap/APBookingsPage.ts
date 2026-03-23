import { expect, Locator, Page } from '@playwright/test'
import { getConfiguredBaseURL } from '../../nexudus-config'
import type { MPBookingWindow } from '../../tests/support/mp-bookings'
import type { NexudusMutationResponse } from '../../api/NexudusApiClient'
import type { NexudusBackofficeBookingResponse } from '../../tests/support/backoffice-api'
import { AbstractPage } from '../shared/AbstractPage'

const shortWeekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

export class APBookingsPage extends AbstractPage {
  readonly addBookingButton: Locator
  readonly addBookingDialog: Locator
  readonly bookingDetailsDialog: Locator
  readonly bookingTimezoneLabel: Locator
  readonly cancelBookingButton: Locator
  readonly cancelBookingConfirmationButton: Locator
  readonly cancelBookingDialog: Locator
  readonly cancellationReasonSelect: Locator
  readonly customerCombobox: Locator
  readonly customerNotesInput: Locator
  readonly endDateTimeInput: Locator
  readonly noRepeatRadio: Locator
  readonly resourceCombobox: Locator
  readonly saveChangesButton: Locator
  readonly startDateTimeInput: Locator
  readonly unavailableMessage: Locator

  constructor(page: Page) {
    super(page)

    this.addBookingButton = page.getByRole('button', { name: 'Add booking' })
    this.addBookingDialog = page.locator('[role="dialog"]').filter({ hasText: 'Add booking' }).first()
    this.bookingDetailsDialog = page.locator('[role="dialog"]').filter({ has: page.getByRole('button', { name: 'Save changes' }) }).first()
    this.bookingTimezoneLabel = this.bookingDetailsDialog.getByText(/Start \/ end times \([^)]+\)/).first()
    this.cancelBookingButton = this.bookingDetailsDialog.getByRole('button', { name: 'Cancel booking' })
    this.cancelBookingDialog = page.locator('[role="dialog"]').filter({ has: page.getByRole('button', { name: 'Never mind' }) }).first()
    this.cancellationReasonSelect = this.cancelBookingDialog.locator('select[name="Cancellation Reason"]')
    this.cancelBookingConfirmationButton = this.cancelBookingDialog.getByRole('button', { name: 'Cancel booking' })
    this.customerCombobox = this.addBookingDialog.getByRole('combobox', { name: /Customer/i }).first()
    this.resourceCombobox = this.addBookingDialog.getByRole('combobox', { name: /Resource/i }).first()
    this.startDateTimeInput = this.addBookingDialog
      .getByRole('textbox', { name: /Press the down key to open a popover containing a calendar\./i })
      .first()
    this.endDateTimeInput = this.addBookingDialog
      .getByRole('textbox', { name: /calendar\./i })
      .nth(1)
    this.customerNotesInput = this.addBookingDialog.getByRole('textbox', { name: 'Customer notes' })
    this.noRepeatRadio = this.addBookingDialog.getByRole('radio', { name: 'This booking does not repeat.' })
    this.saveChangesButton = this.addBookingDialog.getByRole('button', { name: 'Save changes' })
    this.unavailableMessage = this.addBookingDialog.getByText('You cannot place this booking')
  }

  async navigateToNewBooking() {
    await this.installBlockingDialogSuppression()
    await this.page.goto(new URL('/operations/calendar/bookings/new', getConfiguredBaseURL('NEXUDUS_AP_BASE_URL')).toString(), {
      waitUntil: 'domcontentloaded',
    })
    await this.dismissBlockingDialogs()

    if (await this.addBookingDialog.isVisible().catch(() => false)) {
      return
    }

    await expect(this.addBookingButton).toBeVisible({ timeout: 30000 })
    await this.addBookingButton.click()
    await expect(this.addBookingDialog).toBeVisible({ timeout: 30000 })
  }

  async navigateToExistingBooking(bookingId: number) {
    await this.installBlockingDialogSuppression()
    await this.page.goto(new URL(`/operations/bookings/${bookingId}`, getConfiguredBaseURL('NEXUDUS_AP_BASE_URL')).toString(), {
      waitUntil: 'domcontentloaded',
    })
    await this.dismissBlockingDialogs()
  }

  async getBusinessTimeZone() {
    await this.installBlockingDialogSuppression()
    await this.page.goto(new URL('/operations/bookings', getConfiguredBaseURL('NEXUDUS_AP_BASE_URL')).toString(), {
      waitUntil: 'domcontentloaded',
    })
    await this.dismissBlockingDialogs()

    await expect
      .poll(
        () =>
          this.page
            .locator('a[href]')
            .evaluateAll((links) =>
              links
                .map((link) => link.getAttribute('href'))
                .find((href) => /^\/operations\/bookings\/\d+$/.test(href || '')) || null,
            ),
        {
          message: 'Expected the AP bookings list to expose at least one existing booking link so the UI-only AP utility can read the business timezone.',
          timeout: 30000,
        },
      )
      .not.toBeNull()

    const existingBookingHref = await this.page.locator('a[href]').evaluateAll(
      (links) =>
        links
          .map((link) => link.getAttribute('href'))
          .find((href) => /^\/operations\/bookings\/\d+$/.test(href || '')) || null,
    )
    expect(existingBookingHref, 'Expected the AP bookings list to expose a concrete booking detail link for timezone lookup.').toBeTruthy()

    await this.page.goto(new URL(existingBookingHref, getConfiguredBaseURL('NEXUDUS_AP_BASE_URL')).toString(), {
      waitUntil: 'domcontentloaded',
    })
    await this.dismissBlockingDialogs()

    const timezoneLabel = await this.bookingTimezoneLabel.textContent()
    const businessTimeZone = timezoneLabel?.match(/\(([^)]+)\)/)?.[1]?.trim() || ''

    expect(businessTimeZone, 'Expected the AP booking form to expose the current business timezone in the start/end times label.').toBeTruthy()

    return businessTimeZone
  }

  async isOneOffBookingAvailable({
    bookingWindow,
    customerName,
    resourceName,
  }: {
    bookingWindow: MPBookingWindow
    customerName: string
    resourceName: string
  }) {
    await this.prepareOneOffBooking({
      bookingWindow,
      customerName,
      resourceName,
    })

    return this.isCurrentBookingWindowAvailable()
  }

  async openOneOffBookingDraft({
    customerName,
    resourceName,
  }: {
    customerName: string
    resourceName: string
  }) {
    await this.navigateToNewBooking()
    await this.selectComboboxOption(this.customerCombobox, customerName)
    await this.selectComboboxOption(this.resourceCombobox, resourceName)
    await this.ensureNoRepeatSelected()
  }

  async createOneOffBooking({
    bookingWindow,
    customerName,
    resourceName,
  }: {
    bookingWindow: MPBookingWindow
    customerName: string
    resourceName: string
  }) {
    await this.prepareOneOffBooking({
      bookingWindow,
      customerName,
      resourceName,
    })
    expect(
      await this.isCurrentBookingWindowAvailable(),
      `Expected the AP booking form to allow ${resourceName} on ${bookingWindow.dateISO} at ${bookingWindow.startTimeLabel}.`,
    ).toBe(true)

    return this.saveCurrentBooking()
  }

  async setBookingWindow(bookingWindow: MPBookingWindow) {
    await this.replaceInputValue(
      this.startDateTimeInput,
      formatApBookingDateTime(bookingWindow, bookingWindow.startMinutesSinceMidnight),
    )
    await this.replaceInputValue(
      this.endDateTimeInput,
      formatApBookingDateTime(bookingWindow, bookingWindow.endMinutesSinceMidnight),
    )
    await this.endDateTimeInput.press('Tab').catch(() => {})
    await this.page.keyboard.press('Escape').catch(() => {})

    await expect(this.startDateTimeInput).toHaveValue(/\S+/, { timeout: 5000 })
    await expect(this.endDateTimeInput).toHaveValue(/\S+/, { timeout: 5000 })
  }

  async ensureNoRepeatSelected() {
    if (!(await this.noRepeatRadio.isChecked().catch(() => false))) {
      await this.noRepeatRadio.check()
    }

    await expect(this.noRepeatRadio).toBeChecked()
  }

  async saveCurrentBooking() {
    const createResponsePromise = this.page
      .waitForResponse(
        (response) => {
          try {
            const url = new URL(response.url())
            return url.pathname === '/api/spaces/bookings' && response.request().method() === 'POST'
          } catch {
            return false
          }
        },
        { timeout: 30000 },
      )
      .catch(() => null)

    await this.saveChangesButton.click({ force: true })
    const createResponse = await createResponsePromise

    expect(createResponse, 'Expected the AP UI save flow to issue a booking create request.').toBeTruthy()

    const createResponseBody = (await createResponse!.json().catch(() => null)) as NexudusMutationResponse<NexudusBackofficeBookingResponse> | null
    return createResponseBody?.Value || null
  }

  async cancelBookingById(bookingId: number) {
    await this.navigateToExistingBooking(bookingId)

    if (!(await this.cancelBookingButton.isVisible().catch(() => false))) {
      return false
    }

    await this.cancelBookingButton.click()
    await expect(this.cancelBookingDialog).toBeVisible({ timeout: 10000 })
    await this.cancellationReasonSelect.selectOption({ label: 'No longer needed' })

    const cancelResponsePromise = this.page.waitForResponse(
      (response) => {
        try {
          const url = new URL(response.url())
          return url.pathname === '/api/spaces/bookings/runCommand' && response.request().method() === 'POST'
        } catch {
          return false
        }
      },
      { timeout: 15000 },
    )

    await this.cancelBookingConfirmationButton.click()
    const cancelResponse = await cancelResponsePromise
    const cancelResponseBody = (await cancelResponse.json().catch(() => null)) as NexudusMutationResponse | null

    expect(cancelResponseBody?.WasSuccessful, `Expected the AP booking cancel flow for booking ${bookingId} to complete successfully.`).toBe(
      true,
    )
    await expect(this.cancelBookingButton).toHaveCount(0, { timeout: 15000 })

    return true
  }

  async isCurrentBookingWindowAvailable() {
    await this.page.waitForTimeout(1000)
    await this.dismissBlockingDialogs()

    return !(await this.unavailableMessage.isVisible().catch(() => false))
  }

  private async prepareOneOffBooking({
    bookingWindow,
    customerName,
    resourceName,
  }: {
    bookingWindow: MPBookingWindow
    customerName: string
    resourceName: string
  }) {
    await this.openOneOffBookingDraft({
      customerName,
      resourceName,
    })
    await this.setBookingWindow(bookingWindow)
  }

  private async selectComboboxOption(combobox: Locator, optionLabel: string) {
    await combobox.click()
    await combobox.fill('')
    await combobox.pressSequentially(optionLabel, { delay: 40 })
    await this.page.keyboard.press('ArrowDown')
    await this.page.keyboard.press('Enter')
    await expect(combobox).toHaveValue(optionLabel, { timeout: 10000 })
  }

  private async replaceInputValue(input: Locator, value: string) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await input.click()
      await this.page.keyboard.press('Meta+A').catch(() => this.page.keyboard.press('Control+A').catch(() => {}))
      await input.fill(value)

      const currentValue = await input.inputValue().catch(() => '')

      if (currentValue.trim()) {
        return
      }

      await input.click()
      await this.page.keyboard.press('Meta+A').catch(() => this.page.keyboard.press('Control+A').catch(() => {}))
      await input.pressSequentially(value, { delay: 20 })

      const typedValue = await input.inputValue().catch(() => '')

      if (typedValue.trim()) {
        return
      }
    }
  }
}

function formatApBookingDateTime(bookingWindow: MPBookingWindow, minutesSinceMidnight: number) {
  const minutesPerDay = 24 * 60
  const dayOffset = Math.floor(minutesSinceMidnight / minutesPerDay)
  const normalizedMinutesSinceMidnight = ((minutesSinceMidnight % minutesPerDay) + minutesPerDay) % minutesPerDay
  const bookingDate = new Date(Date.UTC(bookingWindow.year, bookingWindow.month - 1, bookingWindow.day + dayOffset))
  const weekdayLabel = shortWeekdayNames[bookingDate.getUTCDay()]
  const monthLabel = shortMonthNames[bookingDate.getUTCMonth()]
  const hour24 = Math.floor(normalizedMinutesSinceMidnight / 60)
  const minute = normalizedMinutesSinceMidnight % 60
  const meridiemLabel = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 || 12

  return `${weekdayLabel}, ${monthLabel} ${padNumber(bookingDate.getUTCDate())}, ${bookingDate.getUTCFullYear()} ${hour12}:${padNumber(minute)} ${meridiemLabel}`
}

function padNumber(value: number) {
  return String(value).padStart(2, '0')
}
