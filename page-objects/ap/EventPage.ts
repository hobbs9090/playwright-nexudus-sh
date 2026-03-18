import { expect, Locator, Page } from '@playwright/test'
import { generateUniqueName, getContributorInitials } from '../../helpers'
import { AbstractPage } from '../shared/AbstractPage'

function getNextSaturdayDate() {
  const date = new Date()
  const day = date.getDay()
  const daysUntilSaturday = (6 - day + 7) % 7 || 7
  date.setDate(date.getDate() + daysUntilSaturday)
  return date
}

function formatEventDateTime(date: Date, hours24: number, minutes: number) {
  const eventDate = new Date(date)
  eventDate.setHours(hours24, minutes, 0, 0)

  const weekday = eventDate.toLocaleDateString('en-GB', { weekday: 'short' })
  const month = eventDate.toLocaleDateString('en-GB', { month: 'short' })
  const day = eventDate.getDate()
  const year = eventDate.getFullYear()
  const time = eventDate.toLocaleTimeString('en-GB', {
    hour: 'numeric',
    hour12: true,
    minute: '2-digit',
  })

  return `${weekday}, ${month} ${day}, ${year} ${time}`
}

function shouldAppendUniqueSuffix() {
  const rawValue = process.env.NEXUDUS_AP_EVENT_APPEND_UNIQUE_SUFFIX?.trim().toLowerCase()

  if (!rawValue) {
    return true
  }

  return !['0', 'false', 'no', 'off'].includes(rawValue)
}

export class EventPage extends AbstractPage {
  readonly addEventButton: Locator
  readonly eventNameInput: Locator
  readonly eventSummaryInput: Locator
  readonly eventDescriptionInput: Locator
  readonly eventDetailsHeading: Locator
  readonly saveChangesButton: Locator
  readonly startDateInput: Locator
  readonly endDateInput: Locator

  constructor(page: Page) {
    super(page)
    this.addEventButton = page.getByRole('button', { name: 'Add event' })
    this.eventNameInput = page.getByRole('textbox', { name: 'Name', exact: true })
    this.eventSummaryInput = page.locator('textarea').first()
    this.eventDescriptionInput = page.locator('.fr-element[contenteditable="true"]').first()
    this.eventDetailsHeading = page.getByRole('heading', { name: 'Event details' })
    this.startDateInput = page.locator('input.euiDatePickerRange__start')
    this.endDateInput = page.locator('input.euiDatePickerRange__end')
    this.saveChangesButton = page.getByRole('button', { name: 'Save changes' })
  }

  async navigateToList() {
    await this.page.goto('/content/calendarEvents')
    await this.dismissBlockingDialogs()
    await this.page.waitForTimeout(1000)
  }

  async fillDateTimeInput(input: Locator, value: string) {
    await input.click({ force: true })
    await input.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
    await input.fill(value)
    await input.press('Tab')
    await expect(input).toHaveValue(new RegExp(value.replace(/\s+/g, '\\s+'), 'i'))
  }

  async createAstronomyNightEvent() {
    const nextSaturday = getNextSaturdayDate()
    const eventBaseName = process.env.NEXUDUS_AP_EVENT_NAME?.trim() || 'Astronomy Night'
    const contributorInitials = getContributorInitials()
    const eventName = shouldAppendUniqueSuffix() ? generateUniqueName(eventBaseName, contributorInitials) : eventBaseName
    const startDateTime = formatEventDateTime(nextSaturday, 19, 0)
    const endDateTime = formatEventDateTime(nextSaturday, 23, 0)

    await this.navigateToList()
    await this.addEventButton.click({ force: true })
    await expect(this.page).toHaveURL(/\/content\/calendarEvents\/new(?:\?|$)/)
    await expect(this.eventDetailsHeading).toBeVisible()

    await this.eventNameInput.fill(eventName)
    await this.fillDateTimeInput(this.startDateInput, startDateTime)
    await this.fillDateTimeInput(this.endDateInput, endDateTime)
    await this.eventSummaryInput.fill('An evening session exploring celestial coordinates, star charts, and telescope alignment.')
    await this.eventDescriptionInput.fill(
      'Join us for Astronomy Night from 7:00 PM to 11:00 PM to learn the fundamentals of mapping the night sky and tracking celestial objects.',
    )

    const saveResponsePromise = this.page.waitForResponse(
      (response) =>
        /\/api\/.*calendarEvents/i.test(response.url()) && ['POST', 'PUT'].includes(response.request().method()),
      { timeout: 30000 },
    )

    await this.saveChangesButton.click({ force: true })
    const saveResponse = await saveResponsePromise
    const responseBody = await saveResponse.json().catch(() => null)

    if (responseBody?.WasSuccessful === false) {
      throw new Error(`Event save failed: ${JSON.stringify(responseBody)}`)
    }

    if (responseBody?.Value?.Id) {
      await this.page.goto(`/content/calendarEvents/${responseBody.Value.Id}`)
      await this.dismissBlockingDialogs()
    }

    await expect(this.eventNameInput).toHaveValue(eventName)
  }
}
