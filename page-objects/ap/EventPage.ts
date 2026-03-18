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
  readonly allCustomersRadio: Locator
  readonly eventDialog: Locator
  readonly eventCapacityLimitRadio: Locator
  readonly eventCapacityLimitLabel: Locator
  readonly eventNameInput: Locator
  readonly eventSummaryInput: Locator
  readonly eventDescriptionInput: Locator
  readonly eventDetailsHeading: Locator
  readonly publishOnInput: Locator
  readonly saveChangesButton: Locator
  readonly startDateInput: Locator
  readonly endDateInput: Locator
  readonly rsvpTab: Locator
  readonly ticketsTab: Locator
  readonly ticketsNotesInput: Locator
  readonly addTicketButton: Locator
  readonly ticketDescriptionInput: Locator
  readonly ticketDialog: Locator
  readonly ticketNameInput: Locator
  readonly ticketNotesInput: Locator
  readonly ticketNotesEditor: Locator
  readonly ticketSaveChangesButton: Locator

  constructor(page: Page) {
    super(page)
    this.addEventButton = page.getByRole('button', { name: 'Add event' })
    this.allCustomersRadio = page.getByRole('radio', { name: 'All customers' })
    this.eventDialog = page.locator('[role="dialog"]').first()
    this.eventCapacityLimitRadio = page.getByRole('radio', { name: /Limit this event to 100 attendees\./i })
    this.eventCapacityLimitLabel = page.locator('label').filter({ hasText: 'Limit this event to 100 attendees.' }).last()
    this.eventNameInput = page.getByRole('textbox', { name: 'Name', exact: true })
    this.eventSummaryInput = page.locator('textarea').first()
    this.eventDescriptionInput = page.locator('.fr-element[contenteditable="true"]').first()
    this.eventDetailsHeading = page.getByRole('heading', { name: 'Event details' })
    this.publishOnInput = page.locator('input[aria-label*="popover containing a calendar."]').last()
    this.startDateInput = page.locator('input.euiDatePickerRange__start')
    this.endDateInput = page.locator('input.euiDatePickerRange__end')
    this.rsvpTab = page.getByRole('tab', { name: 'RSVP' })
    this.ticketsTab = page.getByRole('tab', { name: 'Tickets' })
    this.ticketsNotesInput = this.eventDialog.locator('textarea').last()
    this.addTicketButton = page.getByRole('button', { name: 'Add ticket' })
    this.ticketDialog = page.locator('[role="dialog"]').last()
    this.ticketDescriptionInput = this.ticketDialog.getByLabel('Ticket description')
    this.ticketNameInput = this.ticketDialog.getByLabel('Ticket name')
    this.ticketNotesInput = this.ticketDialog.getByLabel('Ticket notes')
    this.ticketNotesEditor = this.ticketDialog.locator('.fr-element[contenteditable="true"]').first()
    this.saveChangesButton = this.eventDialog.getByRole('button', { name: 'Save changes' })
    this.ticketSaveChangesButton = this.ticketDialog.getByRole('button', { name: 'Save changes' })
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

  async setDateTimeInputValue(input: Locator, value: string) {
    await input.evaluate((element, newValue) => {
      if (!(element instanceof HTMLInputElement)) {
        throw new Error('Expected an input element')
      }

      element.value = newValue
      element.dispatchEvent(new Event('input', { bubbles: true }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
    }, value)
  }

  async fillRichTextField(input: Locator, value: string) {
    await input.fill(value)
    await expect(input).toHaveValue(value)
  }

  async setRsvpOptions(ticketNotes: string) {
    await this.page.evaluate((notes) => {
      const limitLabel = Array.from(document.querySelectorAll('label')).find((label) =>
        (label.textContent || '').includes('Limit this event to 100 attendees.')
      )

      if (!(limitLabel instanceof HTMLLabelElement)) {
        throw new Error('Could not find the attendee limit label')
      }

      const limitInput = limitLabel.htmlFor ? document.getElementById(limitLabel.htmlFor) : limitLabel.querySelector('input')

      if (!(limitInput instanceof HTMLInputElement)) {
        throw new Error('Could not find the attendee limit input')
      }

      limitInput.click()

      const eventDialog = document.querySelector('[role="dialog"]')
      const noteTextareas = eventDialog ? eventDialog.querySelectorAll('textarea') : document.querySelectorAll('textarea')
      const ticketNotesInput = noteTextareas.item(noteTextareas.length - 1)

      if (!(ticketNotesInput instanceof HTMLTextAreaElement)) {
        throw new Error('Could not find the ticket notes input')
      }

      ticketNotesInput.value = notes
      ticketNotesInput.dispatchEvent(new Event('input', { bubbles: true }))
      ticketNotesInput.dispatchEvent(new Event('change', { bubbles: true }))
    }, ticketNotes)
  }

  async createAstronomyNightEvent() {
    const nextSaturday = getNextSaturdayDate()
    const now = new Date()
    const eventBaseName = process.env.NEXUDUS_AP_EVENT_NAME?.trim() || 'Astronomy Night'
    const contributorInitials = getContributorInitials()
    const eventName = shouldAppendUniqueSuffix() ? generateUniqueName(eventBaseName, contributorInitials) : eventBaseName
    const startDateTime = formatEventDateTime(nextSaturday, 19, 0)
    const endDateTime = formatEventDateTime(nextSaturday, 23, 0)
    const publishDateTime = formatEventDateTime(now, 12, 0)
    const eventSummary = 'An evening session exploring celestial coordinates, star charts, and telescope alignment.'
    const eventDescription =
      'Join us for Astronomy Night from 7:00 PM to 11:00 PM to learn the fundamentals of mapping the night sky and tracking celestial objects.'
    const ticketDescription = 'Entry to Astronomy Night with access to the full evening schedule and telescope session.'
    const ticketNotes = 'Bring warm clothes and arrive 15 minutes early for check-in and telescope setup.'

    await this.navigateToList()
    await this.addEventButton.click({ force: true })
    await expect(this.page).toHaveURL(/\/content\/calendarEvents\/new(?:\?|$)/)
    await expect(this.eventDetailsHeading).toBeVisible()

    await this.eventNameInput.fill(eventName)
    await this.allCustomersRadio.check()
    await this.fillDateTimeInput(this.startDateInput, startDateTime)
    await this.fillDateTimeInput(this.endDateInput, endDateTime)
    await this.setDateTimeInputValue(this.publishOnInput, publishDateTime)
    await this.fillRichTextField(this.eventSummaryInput, eventSummary)
    await this.eventDescriptionInput.fill(eventDescription)

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

    await this.rsvpTab.click()
    await this.setRsvpOptions(ticketNotes)

    const updateEventResponsePromise = this.page
      .waitForResponse(
        (response) =>
          /\/api\/.*calendarEvents/i.test(response.url()) && ['POST', 'PUT'].includes(response.request().method()),
        { timeout: 30000 },
      )
      .catch(() => null)

    await this.saveChangesButton.click({ force: true })
    await updateEventResponsePromise

    await this.ticketsTab.click()
    await this.addTicketButton.click()
    await this.ticketDialog.getByText('Add ticket').waitFor({ state: 'visible' })
    await this.ticketNameInput.fill('Standard ticket')
    await this.ticketDescriptionInput.fill(ticketDescription)
    await this.ticketNotesEditor.fill(ticketNotes)

    const addTicketResponsePromise = this.page
      .waitForResponse(
        (response) =>
          /\/api\/.*ticket/i.test(response.url()) && ['POST', 'PUT'].includes(response.request().method()),
        { timeout: 30000 },
      )
      .catch(() => null)

    await this.ticketSaveChangesButton.click({ force: true })
    await addTicketResponsePromise
    await expect(this.ticketDialog.getByText('Add ticket')).not.toBeVisible({ timeout: 30000 })
    await expect(this.page.getByText('Standard ticket', { exact: true })).toBeVisible({ timeout: 30000 })
  }
}
