import { expect, Locator, Page } from '@playwright/test'
import { AbstractPage } from '../shared/AbstractPage'

export class CoursePage extends AbstractPage {
  readonly addCourseButton: Locator
  readonly courseSummaryInput: Locator
  readonly fullCourseDescriptionInput: Locator
  readonly overviewToggle: Locator
  readonly saveChangesButton: Locator
  readonly titleInput: Locator

  constructor(page: Page) {
    super(page)
    this.addCourseButton = page.getByRole('button', { name: 'Add course' })
    this.titleInput = page.getByLabel('Title')
    this.courseSummaryInput = page.getByLabel('Course summary')
    this.fullCourseDescriptionInput = page.locator('textarea').nth(1)
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
    await this.courseSummaryInput.fill('A flower arranging course covering bouquets, colour palettes, and seasonal stems.')
    await this.fullCourseDescriptionInput.fill(
      'Learn the basics of flower arranging with hands-on bouquet design, vase composition, and care tips.',
    )

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
}
