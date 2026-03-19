import { expect, Locator, Page } from '@playwright/test'
import { AbstractPage } from '../shared/AbstractPage'

export class CoursePage extends AbstractPage {
  readonly addCourseButton: Locator
  readonly courseSummaryInput: Locator
  readonly fullCourseDescriptionInput: Locator
  readonly hostCombobox: Locator
  readonly hostOptionsButton: Locator
  readonly overviewToggle: Locator
  readonly publishedToggle: Locator
  readonly saveChangesButton: Locator
  readonly titleInput: Locator

  constructor(page: Page) {
    super(page)
    this.addCourseButton = page.getByRole('button', { name: 'Add course' })
    this.titleInput = page.getByLabel('Title')
    this.hostCombobox = page.getByLabel('Host')
    this.hostOptionsButton = this.hostCombobox
      .locator('xpath=ancestor::div[contains(@class,"euiFormControlLayout__childrenWrapper")][1]')
      .locator('button[aria-label="Open list of options"]')
    this.courseSummaryInput = page.getByLabel('Course summary')
    this.fullCourseDescriptionInput = page.locator('textarea').nth(1)
    this.publishedToggle = page.getByText('This course is published').locator('..').locator('[role="switch"]').first()
    this.overviewToggle = page.getByLabel('Overview')
    this.saveChangesButton = page.getByRole('button', { name: 'Save changes' })
  }

  async navigateToList() {
    await this.page.goto('/content/courses')
    await this.dismissBlockingDialogs()
    await this.page.waitForTimeout(1000)
  }

  async createCourse(title: string) {
    await this.navigateToList()
    await this.addCourseButton.click({ force: true })
    await expect(this.page).toHaveURL(/\/content\/courses\/new(?:\?|$)/)

    await this.titleInput.fill(title)
    await this.selectRandomHost()
    await this.courseSummaryInput.fill('A flower arranging course covering bouquets, colour palettes, and seasonal stems.')
    await this.fullCourseDescriptionInput.fill(
      'Learn the basics of flower arranging with hands-on bouquet design, vase composition, and care tips.',
    )

    if ((await this.publishedToggle.getAttribute('aria-checked')) !== 'true') {
      await this.publishedToggle.click()
    }

    if ((await this.overviewToggle.getAttribute('aria-checked')) !== 'true') {
      await this.overviewToggle.click()
    }

    const saveResponsePromise = this.page
      .waitForResponse(
        (response) => /\/api\/.*courses/i.test(response.url()) && ['POST', 'PUT'].includes(response.request().method()),
        { timeout: 30000 },
      )
      .catch(() => null)

    await this.saveChangesButton.click({ force: true })
    const saveResponse = await saveResponsePromise

    if (saveResponse) {
      const responseBody = await saveResponse.json().catch(() => null)

      if (responseBody?.WasSuccessful === false) {
        throw new Error(`Course save failed: ${JSON.stringify(responseBody)}`)
      }
    }

    await expect.poll(() => this.isCourseVisible(title), { timeout: 30000 }).toBe(true)
  }

  async isCourseVisible(title: string) {
    await this.navigateToList()
    return this.page.getByText(title, { exact: true }).isVisible().catch(() => false)
  }

  async selectRandomHost() {
    await this.hostOptionsButton.click()

    const hostOptions = this.page.getByRole('option')
    await expect(hostOptions.first()).toBeVisible({ timeout: 15000 })

    const hostOptionCount = await hostOptions.count()
    expect(hostOptionCount, 'Expected at least one AP course host option to be available.').toBeGreaterThan(0)

    const randomIndex = Math.floor(Math.random() * hostOptionCount)
    await hostOptions.nth(randomIndex).click()
  }
}
