import { expect, Locator, Page } from '@playwright/test'
import { AbstractPage } from '../shared/AbstractPage'
import {
  findNearestAvailableMpSlot,
  formatMinutesSinceMidnight,
  parseMpAvailabilitySlotTooltip,
  type MPAvailabilitySlot,
  type MPBookingWindow,
} from '../../tests/support/mp-bookings'

export type MPBookableResource = {
  id: number
  name: string
}

export type MPActivityBookingRecord = {
  CoworkerId: number
  FromTime: string
  Id: number
  IsCancelled: boolean
  ResourceId: number
  ResourceName: string
  ToTime: string
  UniqueId?: string | null
}

type MPActivityBookingFilter = {
  bookingWindow: Pick<MPBookingWindow, 'endDateTimeLocalWithSeconds' | 'startDateTimeLocalWithSeconds'>
  coworkerId: number
  resourceId: number
  resourceName: string
}

type MPActivityBookingLinkRecord = {
  href: string
  id: number
  text: string
}

export type MPBookingSelection = {
  datePickerValue: string
  endTimeLabel: string
  repeatLabel: string
  resourceName: string
  startTimeLabel: string
}

export class MPBookingsPage extends AbstractPage {
  readonly allResourcesButton: Locator
  readonly basketCheckoutControl: Locator
  readonly bookingTimeCard: Locator
  readonly bookingTimeHeading: Locator
  readonly bookingsWelcomeContinueButton: Locator
  readonly currentRepeatValue: Locator
  readonly completePurchaseButton: Locator
  readonly endDateInput: Locator
  readonly endTimeValue: Locator
  readonly oneTimeBookingLabel: Locator
  readonly paymentDetailsHeading: Locator
  readonly primaryBookingActionButton: Locator
  readonly repeatComboboxInput: Locator
  readonly repeatUntilDateButton: Locator
  readonly purchaseCompleteHeading: Locator
  readonly repeatValue: Locator
  readonly repeatUntilInput: Locator
  readonly resourceSelect: Locator
  readonly startDateInput: Locator
  readonly startTimeValue: Locator

  constructor(page: Page) {
    super(page)
    this.allResourcesButton = page.getByRole('button', { name: 'All Resources' })
    this.basketCheckoutControl = page.getByRole('link', { name: 'Checkout' }).or(page.getByRole('button', { name: 'Checkout' }))
    this.bookingTimeCard = page.locator('#booking-time')
    this.bookingTimeHeading = page.getByRole('heading', { name: 'Booking time' })
    this.bookingsWelcomeContinueButton = page
      .locator('#bookings-welcome-message-modal')
      .getByRole('button', { name: 'Continue' })
    this.currentRepeatValue = page.locator('#booking-time .css-100u5tu-singleValue').first()
    this.completePurchaseButton = page.getByRole('button', { name: 'Complete purchase' })
    this.endDateInput = page.locator('#booking-time input.rw-widget-input').nth(1)
    this.endTimeValue = page.locator('#ToTime2_input .rw-dropdown-list-value')
    this.oneTimeBookingLabel = page.getByText('One time', { exact: true }).first()
    this.paymentDetailsHeading = page.getByRole('heading', { name: 'Payment details' })
    this.primaryBookingActionButton = page.locator('button.btn.w-100.mb-10').first()
    this.repeatComboboxInput = page.locator('#booking-time input[id^="react-select-"][role="combobox"]').first()
    this.repeatUntilDateButton = page.locator('#booking-time #rw_11_input').locator('xpath=following-sibling::button').first()
    this.purchaseCompleteHeading = page.getByRole('heading', { name: 'Thank you for your purchase!' })
    this.repeatValue = page.locator('#booking-time').getByText('Does not repeat', { exact: true })
    this.repeatUntilInput = page.locator('#rw_11_input')
    this.resourceSelect = page.locator('#booking-time select').first()
    this.startDateInput = page.locator('#booking-time input.rw-widget-input').first()
    this.startTimeValue = page.locator('#FromTime2_input .rw-dropdown-list-value')
  }

  async goto(pathOrUrl: string = '/bookings') {
    return await this.page.goto(pathOrUrl)
  }

  async assertLoaded() {
    await expect(this.page).toHaveURL(/\/bookings(?:\?.*)?$/)
    await expect(this.allResourcesButton).toBeVisible()
  }

  async getBusinessTimeZone() {
    const businessTimeZone = await this.page.evaluate(() => {
      const nextData = (window as Window & {
        __NEXT_DATA__?: {
          props?: {
            mobxStore?: {
              appStore?: {
                business?: {
                  SimpleTimeZone?: {
                    Iana?: string | null
                  }
                }
              }
            }
          }
        }
      }).__NEXT_DATA__

      return nextData?.props?.mobxStore?.appStore?.business?.SimpleTimeZone?.Iana?.trim() || ''
    })

    expect(businessTimeZone, 'Expected the MP bookings bootstrap state to expose the current business IANA timezone.').toBeTruthy()

    return businessTimeZone
  }

  async openBookingEditorForResource(resourceName: string, bookingWindow: MPBookingWindow) {
    await this.page.goto('/bookings?tab=Resources&view=card', { waitUntil: 'domcontentloaded' })
    await this.dismissBookingsWelcomeModalIfPresent()

    const resource = (await this.findBookableResourceInBootstrapState(resourceName)) || (await this.getBookableResource(resourceName))
    const bookingEditorURL = buildBookingEditorURL(this.page.url(), resource.id, bookingWindow)

    await this.page.goto(bookingEditorURL, { waitUntil: 'domcontentloaded' })
    await this.dismissBookingsWelcomeModalIfPresent()

    return resource
  }

  async dismissBookingsWelcomeModalIfPresent() {
    const isVisible = await this.bookingsWelcomeContinueButton.isVisible().catch(() => false)

    if (isVisible) {
      await this.bookingsWelcomeContinueButton.click()
    }
  }

  async assertBookingEditorLoaded(resourceName: string, bookingWindow: MPBookingWindow) {
    await this.dismissBookingsWelcomeModalIfPresent()
    await this.expandBookingTimeSection()
    await expect(this.startDateInput).toHaveValue(bookingWindow.datePickerValue)
    await expect(this.endDateInput).toHaveValue(bookingWindow.datePickerValue)
    await expect(this.startTimeValue).toHaveText(bookingWindow.startTimeLabel)
    await expect(this.endTimeValue).toHaveText(bookingWindow.endTimeLabel)
    await expect(this.repeatValue).toBeVisible()
    await expect(this.bookingTimeHeading, `Expected "${resourceName}" to be bookable for ${bookingWindow.startTimeLabel}-${bookingWindow.endTimeLabel}.`).toBeVisible()
  }

  async isCurrentBookingWindowBookable(timeout: number = 15000) {
    await this.dismissBookingsWelcomeModalIfPresent()
    await this.expandBookingTimeSection()
    await expect(this.primaryBookingActionButton).toBeVisible({ timeout })

    return expect
      .poll(() => this.primaryBookingActionButton.isEnabled().catch(() => false), {
        timeout,
      })
      .toBe(true)
      .then(() => true)
      .catch(() => false)
  }

  async continueCurrentBooking() {
    await this.dismissBookingsWelcomeModalIfPresent()
    await expect(this.primaryBookingActionButton).toBeEnabled({ timeout: 30000 })
    await this.primaryBookingActionButton.click({ force: true, noWaitAfter: true })
    await expect
      .poll(() => new URL(this.page.url()).pathname, {
        message: 'Expected the MP booking continue action to open either the basket or checkout payment page.',
      })
      .toMatch(/\/(?:basket|checkout\/payment)$/)

    return new URL(this.page.url()).pathname
  }

  async openBasket() {
    await this.page.goto('/basket', { waitUntil: 'domcontentloaded' })
  }

  async assertBasketContainsBooking(resourceName: string) {
    await expect(this.page).toHaveURL(/\/basket(?:\?.*)?$/)
    await expect(this.page.getByText(resourceName, { exact: true }).first()).toBeVisible()
    await expect(this.oneTimeBookingLabel).toBeVisible()
    await expect(this.basketCheckoutControl).toBeVisible()
  }

  async checkoutCurrentBasket() {
    await Promise.all([this.page.waitForURL(/\/checkout\/payment(?:\?.*)?$/), this.basketCheckoutControl.click()])
  }

  async assertCheckoutReady() {
    await expect(this.paymentDetailsHeading).toBeVisible({ timeout: 20000 })
    await expect(this.completePurchaseButton).toBeVisible({ timeout: 20000 })
  }

  async completePurchase() {
    await Promise.all([this.page.waitForURL(/\/checkout\/complete(?:\?.*)?$/), this.completePurchaseButton.click()])
  }

  async assertPurchaseComplete() {
    await expect(this.purchaseCompleteHeading).toBeVisible()
    await expect(this.page.getByText('Your order is now complete.')).toBeVisible()
  }

  async getCurrentBookingSelection(expectedResourceName: string = ''): Promise<MPBookingSelection> {
    await expect(this.bookingTimeCard).toBeVisible()

    const selection = await this.page.evaluate((resourceNameFallback) => {
      const normalizeText = (value: string | null | undefined) => (value || '').replace(/\s+/g, ' ').trim()
      const bookingTimeRoot = document.querySelector('#booking-time')
      const dateInputs = bookingTimeRoot?.querySelectorAll<HTMLInputElement>('input.rw-widget-input') || []
      const selectedResourceName =
        (bookingTimeRoot?.querySelector<HTMLSelectElement>('select')?.selectedOptions.item(0)?.textContent || resourceNameFallback).trim()
      const repeatLabel =
        normalizeText(bookingTimeRoot?.querySelector('.css-100u5tu-singleValue')?.textContent) ||
        normalizeText(bookingTimeRoot?.querySelector('[id^="react-select-"][class*="-singleValue"]')?.textContent)

      return {
        datePickerValue: dateInputs.item(0)?.value || '',
        endTimeLabel: normalizeText(document.querySelector('#ToTime2_input .rw-dropdown-list-value')?.textContent),
        repeatLabel,
        resourceName: normalizeText(selectedResourceName),
        startTimeLabel: normalizeText(document.querySelector('#FromTime2_input .rw-dropdown-list-value')?.textContent),
      }
    }, expectedResourceName)

    expect(selection.datePickerValue, 'Expected the MP booking editor to expose a selected start date.').toBeTruthy()
    expect(selection.startTimeLabel, 'Expected the MP booking editor to expose a selected start time.').toBeTruthy()
    expect(selection.endTimeLabel, 'Expected the MP booking editor to expose a selected end time.').toBeTruthy()
    expect(selection.repeatLabel, 'Expected the MP booking editor to expose the current repeat label.').toBeTruthy()

    return selection
  }

  async selectRepeatOption(optionLabel: string) {
    await expect(this.repeatComboboxInput).toBeVisible()
    await this.page.evaluate(() => {
      const repeatInput = document.querySelector<HTMLInputElement>('#booking-time input[id^="react-select-"][role="combobox"]')
      const repeatControl = repeatInput?.closest('[class*="-control"]') as HTMLElement | null

      repeatControl?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    await expect
      .poll(() => this.page.getByRole('option').count(), {
        message: `Expected the MP repeat dropdown to open when selecting "${optionLabel}".`,
        timeout: 5000,
      })
      .toBeGreaterThan(0)
    await this.page.evaluate((targetOptionLabel) => {
      const normalize = (value: string | null | undefined) => (value || '').replace(/\s+/g, ' ').trim()
      const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
        (candidateOption) => normalize(candidateOption.textContent) === targetOptionLabel,
      )

      option?.click()
    }, optionLabel)
    await expect(this.currentRepeatValue).toHaveText(optionLabel)
  }

  async setRepeatUntil(datePickerValue: string) {
    await expect(this.repeatUntilInput).toBeVisible()
    await this.repeatUntilInput.click()
    await this.repeatUntilInput.fill('')
    await this.repeatUntilInput.fill(datePickerValue)
    await this.repeatUntilInput.evaluate((inputElement, nextValue) => {
      const input = inputElement as HTMLInputElement
      const inputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set

      inputValueSetter?.call(input, nextValue)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      input.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
    }, datePickerValue)
    await this.repeatUntilInput.press('Tab').catch(() => {})

    const typedValueStuck = await expect
      .poll(() => this.repeatUntilInput.inputValue().catch(() => ''), {
        timeout: 3000,
      })
      .toBe(datePickerValue)
      .then(() => true)
      .catch(() => false)

    if (typedValueStuck) {
      return
    }

    const popupId = await this.repeatUntilInput.getAttribute('aria-owns')
    const targetRepeatUntilDate = parseDatePickerValue(datePickerValue)

    await this.repeatUntilDateButton.click()

    if (!popupId) {
      throw new Error(`Could not open the MP repeat-until calendar for "${datePickerValue}" because the popup id was missing.`)
    }

    const calendarPopup = this.page.locator(`#${popupId}`)
    await this.repeatUntilDateButton.click({ force: true }).catch(() => {})
    const calendarOpenedByButtonClick = await calendarPopup.isVisible().catch(() => false)

    if (!calendarOpenedByButtonClick) {
      await this.repeatUntilDateButton.evaluate((buttonElement) => {
        ;(buttonElement as HTMLButtonElement).click()
      }).catch(() => {})
    }

    const calendarOpenedAfterDomClick = await calendarPopup.isVisible().catch(() => false)

    if (!calendarOpenedAfterDomClick) {
      await this.repeatUntilInput.press('ArrowDown').catch(() => {})
    }

    await expect(calendarPopup).toBeVisible({ timeout: 5000 })
    await calendarPopup.getByText(String(targetRepeatUntilDate.day), { exact: true }).first().click()
    await expect
      .poll(() => this.repeatUntilInput.inputValue().catch(() => ''), {
        timeout: 10000,
      })
      .toBe(datePickerValue)
  }

  async getAvailabilitySlots() {
    const availabilitySlots = await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll<HTMLElement>('#resource-availability-indicator .slot')).map((slot) => ({
        className: slot.className,
        status: slot.classList.contains('available')
          ? 'available'
          : slot.classList.contains('booked')
            ? 'booked'
            : 'other',
        tooltipText: slot.getAttribute('data-tooltip') || '',
      }))
    })

    return availabilitySlots.map((availabilitySlot) => ({
      ...parseMpAvailabilitySlotTooltip(availabilitySlot.tooltipText),
      className: availabilitySlot.className,
      status: availabilitySlot.status,
    })) as MPAvailabilitySlot[]
  }

  async selectNearestAvailableStartTime(targetStartMinutesSinceMidnight: number, durationMinutes: number) {
    const availabilitySlots = await this.getAvailabilitySlots()
    const nearestStartMinutesSinceMidnight = findNearestAvailableMpSlot(
      availabilitySlots,
      targetStartMinutesSinceMidnight,
      durationMinutes,
    )

    if (nearestStartMinutesSinceMidnight === null) {
      throw new Error(`Could not find a same-day available MP slot close to ${targetStartMinutesSinceMidnight} minutes for ${durationMinutes} minutes.`)
    }

    const matchingAvailabilitySlotIndex = availabilitySlots.findIndex(
      (availabilitySlot) =>
        availabilitySlot.status === 'available' &&
        availabilitySlot.startMinutesSinceMidnight === nearestStartMinutesSinceMidnight,
    )

    if (matchingAvailabilitySlotIndex < 0) {
      throw new Error(`Could not find the rendered MP availability slot that starts at ${nearestStartMinutesSinceMidnight} minutes.`)
    }

    const startTime = formatMinutesSinceMidnight(nearestStartMinutesSinceMidnight)
    const endTime = formatMinutesSinceMidnight(nearestStartMinutesSinceMidnight + durationMinutes)

    await this.page.evaluate((availabilitySlotIndex) => {
      const availabilitySlots = Array.from(document.querySelectorAll<HTMLElement>('#resource-availability-indicator .slot'))
      availabilitySlots.at(availabilitySlotIndex)?.click()
    }, matchingAvailabilitySlotIndex)
    await expect(this.startTimeValue).toHaveText(startTime.meridiemLabel)
    await expect(this.endTimeValue).toHaveText(`${endTime.meridiemLabel} (${formatDurationLabel(durationMinutes)})`)

    return {
      endTimeLabel: `${endTime.meridiemLabel} (${formatDurationLabel(durationMinutes)})`,
      startTimeLabel: startTime.meridiemLabel,
    }
  }

  async findActivityBooking(filter: MPActivityBookingFilter) {
    const bookingLinks = await this.loadActivityBookingLinks()
    const matchingBookings = bookingLinks
      .filter((bookingLink) => bookingLink.text.includes(filter.resourceName))
      .sort((leftBooking, rightBooking) => rightBooking.id - leftBooking.id)

    expect(
      matchingBookings.length,
      `Expected MP my activity to include a rendered booking link for "${filter.resourceName}" after checkout.`,
    ).toBeGreaterThan(0)

    const createdBooking = matchingBookings[0]

    await expect(this.page.locator(`a[href="/bookings/edit?booking=${createdBooking.id}"]`).first()).toBeVisible()

    return {
      CoworkerId: filter.coworkerId,
      FromTime: filter.bookingWindow.startDateTimeLocalWithSeconds,
      Id: createdBooking.id,
      IsCancelled: false,
      ResourceId: filter.resourceId,
      ResourceName: filter.resourceName,
      ToTime: filter.bookingWindow.endDateTimeLocalWithSeconds,
      UniqueId: null,
    }
  }

  async findActivityBookingById(bookingId: number) {
    const bookings = await this.loadActivityBookingLinks(true)

    return bookings.find((booking) => booking.id === bookingId) || null
  }

  async assertActivityBookingCancelledOrRemoved(bookingId: number) {
    await expect
      .poll(
        async () => {
          const booking = await this.findActivityBookingById(bookingId)
          return booking === null || isCancelledActivityBookingText(booking.text)
        },
        {
          message: `Expected booking ${bookingId} to be cancelled or removed from the rendered My Activity bookings list after cleanup.`,
          timeout: 15000,
        },
      )
      .toBe(true)
  }

  async captureRenderedActivityBookingIds() {
    const bookingLinks = await this.loadActivityBookingLinks(true)
    return bookingLinks.map((bookingLink) => bookingLink.id)
  }

  async getActivityBookingLinksByIds(bookingIds: number[]) {
    const bookingLinks = await this.loadActivityBookingLinks(true)
    const bookingIdSet = new Set(bookingIds)

    return bookingLinks.filter((bookingLink) => bookingIdSet.has(bookingLink.id))
  }

  async getNewActivityBookingLinks(previousBookingIds: number[], resourceName: string) {
    const previousBookingIdSet = new Set(previousBookingIds)
    const bookingLinks = await this.loadActivityBookingLinks(true)
    const newBookingLinks = bookingLinks
      .filter((bookingLink) => !previousBookingIdSet.has(bookingLink.id) && bookingLink.text.includes(resourceName))
      .sort((leftBookingLink, rightBookingLink) => leftBookingLink.id - rightBookingLink.id)

    expect(newBookingLinks.length, `Expected MP my activity to show new bookings for "${resourceName}" after checkout.`).toBeGreaterThan(0)

    return newBookingLinks
  }

  async findActivityBookingLinksMatching(resourceName: string, bookingWindows: MPBookingWindow[]) {
    const bookingLinks = await this.loadActivityBookingLinks(true)

    return bookingLinks
      .filter((bookingLink) =>
        !isCancelledActivityBookingText(bookingLink.text) &&
        bookingWindows.some((bookingWindow) => activityBookingLinkMatchesWindow(bookingLink.text, resourceName, bookingWindow)),
      )
      .sort((leftBookingLink, rightBookingLink) => leftBookingLink.id - rightBookingLink.id)
  }

  private async findBookableResourceInBootstrapState(resourceName: string): Promise<MPBookableResource | null> {
    return this.page.evaluate((requestedResourceName) => {
      const normalizeText = (value: unknown) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().toLowerCase() : '')
      const normalizedRequestedResourceName = normalizeText(requestedResourceName)
      const nextData = (window as Window & {
        __NEXT_DATA__?: {
          props?: {
            mobxStore?: Record<string, unknown>
          }
        }
      }).__NEXT_DATA__

      if (!nextData) {
        return null
      }

      const roots: Array<{ path: string[]; value: unknown }> = [{ path: ['__NEXT_DATA__'], value: nextData }]
      const mobxStore = nextData.props?.mobxStore

      if (mobxStore) {
        roots.push({ path: ['__NEXT_DATA__', 'props', 'mobxStore'], value: mobxStore })
      }

      const visitedNodes = new WeakSet<object>()
      const candidates: Array<{ id: number; name: string; path: string; score: number }> = []

      const visit = (node: unknown, path: string[]) => {
        if (!node || typeof node !== 'object') {
          return
        }

        if (visitedNodes.has(node)) {
          return
        }

        visitedNodes.add(node)

        if (Array.isArray(node)) {
          node.forEach((childNode, index) => visit(childNode, [...path, String(index)]))
          return
        }

        const record = node as Record<string, unknown>
        const candidateName =
          [record.Name, record.ResourceName, record.DisplayName, record.Title, record.name, record.label]
            .map((value) => (typeof value === 'string' ? value.trim() : ''))
            .find((value) => normalizeText(value) === normalizedRequestedResourceName) || ''
        const candidateId =
          [record.Id, record.ResourceId, record.id, record.resourceId]
            .map((value) => Number(value))
            .find((value) => Number.isInteger(value) && value > 0) || 0

        if (candidateName && candidateId > 0) {
          const pathText = path.join('.').toLowerCase()
          const score =
            (pathText.includes('resource') ? 4 : 0) +
            (pathText.includes('booking') ? 2 : 0) +
            ('ResourceTypeId' in record ? 1 : 0) +
            ('Visible' in record ? 1 : 0)

          candidates.push({
            id: candidateId,
            name: candidateName,
            path: path.join('.'),
            score,
          })
        }

        Object.entries(record).forEach(([key, value]) => {
          visit(value, [...path, key])
        })
      }

      roots.forEach((root) => visit(root.value, root.path))

      if (candidates.length === 0) {
        return null
      }

      candidates.sort((leftCandidate, rightCandidate) => {
        if (rightCandidate.score !== leftCandidate.score) {
          return rightCandidate.score - leftCandidate.score
        }

        if (leftCandidate.path.length !== rightCandidate.path.length) {
          return leftCandidate.path.length - rightCandidate.path.length
        }

        return leftCandidate.id - rightCandidate.id
      })

      return {
        id: candidates[0].id,
        name: candidates[0].name,
      }
    }, resourceName)
  }

  private async getBookableResource(resourceName: string): Promise<MPBookableResource> {
    const resourceLink = this.page.getByRole('link', { name: new RegExp(`^${escapeRegExp(resourceName)}\\b`, 'i') }).first()

    await expect(resourceLink, `Expected "${resourceName}" to be present in MP bookings.`).toBeVisible()

    const resourceHref = await resourceLink.getAttribute('href')

    expect(resourceHref, `Expected "${resourceName}" to expose a booking editor link.`).toBeTruthy()

    const resourceIdMatch = resourceHref!.match(/[?&]resource=(\d+)/)

    expect(resourceIdMatch, `Expected the booking link for "${resourceName}" to include a numeric resource id.`).toBeTruthy()

    return {
      id: Number(resourceIdMatch![1]),
      name: resourceName,
    }
  }

  private async expandBookingTimeSection() {
    const collapseButton = this.page.locator('#booking-time-collapse-button')

    if (await collapseButton.isVisible().catch(() => false)) {
      return
    }

    await this.bookingTimeCard.click()
    await expect(collapseButton).toBeVisible()
    await expect(this.bookingTimeHeading).toBeVisible()
  }

  private async loadActivityBookingLinks(allowEmpty: boolean = false) {
    await this.page.goto('/my-activity?tab=Bookings', { waitUntil: 'domcontentloaded' })
    await expect(this.page.getByRole('heading', { name: 'My Activity' })).toBeVisible()

    if (!allowEmpty) {
      await expect
        .poll(() => this.page.locator('a[href*="/bookings/edit?booking="]').count(), {
          message: 'Expected the My Activity bookings view to render at least one booking link.',
          timeout: 15000,
        })
        .toBeGreaterThan(0)
    } else {
      await this.page.waitForTimeout(500)
    }

    return this.page.evaluate(() => {
      const normalizeText = (value: string | null | undefined) => (value || '').replace(/\s+/g, ' ').trim()

      return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/bookings/edit?booking="]')).map((link) => {
        const href = link.getAttribute('href') || ''
        const bookingIdMatch = href.match(/booking=(\d+)/)
        const bookingRow =
          link.closest('tr') ||
          link.closest('[role="row"]') ||
          link.closest('article') ||
          link.closest('.card') ||
          link.parentElement
        const bookingText = normalizeText(bookingRow?.textContent || link.textContent)

        return {
          href,
          id: Number(bookingIdMatch?.[1] || '0'),
          text: bookingText,
        }
      })
    }) as Promise<MPActivityBookingLinkRecord[]>
  }

}

function formatDurationLabel(durationMinutes: number) {
  return durationMinutes % 60 === 0
    ? `${durationMinutes / 60} hour${durationMinutes === 60 ? '' : 's'}`
    : `${durationMinutes} minutes`
}

function activityBookingLinkMatchesWindow(bookingText: string, resourceName: string, bookingWindow: MPBookingWindow) {
  const expectedDateTexts = getExpectedActivityBookingDateTexts(bookingWindow)
  const expectedTimeRangeText = `${bookingWindow.startTimeLabel} - ${formatMinutesSinceMidnight(bookingWindow.endMinutesSinceMidnight).meridiemLabel}`

  return (
    bookingText.includes(resourceName) &&
    expectedDateTexts.some((expectedDateText) => bookingText.includes(expectedDateText)) &&
    bookingText.includes(expectedTimeRangeText)
  )
}

function isCancelledActivityBookingText(bookingText: string) {
  return /cancelled/i.test(bookingText)
}

function getExpectedActivityBookingDateTexts(bookingWindow: MPBookingWindow) {
  const bookingDate = new Date(Date.UTC(bookingWindow.year, bookingWindow.month - 1, bookingWindow.day))
  const longUsDate = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(bookingDate)

  return [bookingWindow.datePickerValue, bookingWindow.dateISO, longUsDate]
}

function parseDatePickerValue(datePickerValue: string) {
  const match = datePickerValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)

  if (!match) {
    throw new Error(`Could not parse MP date-picker value "${datePickerValue}".`)
  }

  return {
    day: Number(match[2]),
    month: Number(match[1]),
    year: Number(match[3]),
  }
}

function buildBookingEditorURL(currentUrl: string, resourceId: number, bookingWindow: MPBookingWindow) {
  // The MP bookings editor uses the local start/end query params as the booking source of truth.
  const bookingEditorURL = new URL('/bookings/edit', currentUrl)

  bookingEditorURL.searchParams.set('start', bookingWindow.startDateTimeLocal)
  bookingEditorURL.searchParams.set('end', bookingWindow.endDateTimeLocal)
  bookingEditorURL.searchParams.set('resource', String(resourceId))
  bookingEditorURL.searchParams.set('return_url', '/bookings?v=latest&')

  return bookingEditorURL.toString()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
