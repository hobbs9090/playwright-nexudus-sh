import { expect, Locator, Page } from '@playwright/test'
import { AbstractPage } from '../shared/AbstractPage'

export class CoursePage extends AbstractPage {
  readonly addCourseButton: Locator
  readonly allLocationsButton: Locator
  readonly courseDialog: Locator
  readonly courseSummaryInput: Locator
  readonly fullCourseDescriptionInput: Locator
  readonly hostCombobox: Locator
  readonly hostOptionsButton: Locator
  readonly largeImageInput: Locator
  readonly lessonsTab: Locator
  readonly membersTab: Locator
  readonly publishedToggle: Locator
  readonly saveChangesButton: Locator
  readonly showDiscussionBoardToggle: Locator
  readonly showInHomePageToggle: Locator
  readonly showOverviewToggle: Locator
  readonly smallImageInput: Locator
  readonly titleInput: Locator

  constructor(page: Page) {
    super(page)
    this.addCourseButton = page.getByRole('button', { name: 'Add course' })
    this.courseDialog = page.locator('[role="dialog"]').filter({ has: page.getByRole('button', { name: 'Save changes' }) }).first()
    this.titleInput = this.courseDialog.getByLabel('Title')
    this.hostCombobox = this.courseDialog.getByLabel('Host')
    this.hostOptionsButton = this.hostCombobox
      .locator('xpath=ancestor::div[contains(@class,"euiFormControlLayout__childrenWrapper")][1]')
      .locator('button[aria-label="Open list of options"]')
    this.courseSummaryInput = this.courseDialog.getByLabel('Course summary')
    this.fullCourseDescriptionInput = this.courseDialog.locator('textarea.euiMarkdownEditorTextArea').first()
    this.largeImageInput = this.courseDialog.locator('#image-field-LargeImage')
    this.smallImageInput = this.courseDialog.locator('#image-field-Image')
    this.allLocationsButton = this.courseDialog.getByRole('button', { name: 'All locations' })
    this.lessonsTab = this.courseDialog.getByRole('tab', { name: 'Lessons' })
    this.membersTab = this.courseDialog.getByRole('tab', { name: 'Members' })
    this.publishedToggle = this.courseDialog
      .getByText('This course is published')
      .locator('..')
      .locator('[role="switch"]')
      .first()
    this.showOverviewToggle = this.courseDialog
      .getByText('Show course overview to users who have not yet joined this course.')
      .locator('..')
      .locator('[role="switch"]')
      .first()
    this.showInHomePageToggle = this.courseDialog
      .getByText('Feature this course on the home page after users log in')
      .locator('..')
      .locator('[role="switch"]')
      .first()
    this.showDiscussionBoardToggle = this.courseDialog
      .getByText('Create a discussion board group for members of this course.')
      .locator('..')
      .locator('[role="switch"]')
      .first()
    this.saveChangesButton = this.courseDialog.getByRole('button', { name: 'Save changes' })
  }

  async navigateToList() {
    await this.page.goto('/content/courses')
    await this.dismissBlockingDialogs()
    await this.page.waitForTimeout(1000)
  }

  async openCourse(courseId: number) {
    await this.page.goto(`/content/courses/${courseId}`)
    await this.dismissBlockingDialogs()
    await expect(this.courseDialog).toBeVisible({ timeout: 30000 })
  }

  async createCourseShell(title: string) {
    await this.navigateToList()
    await this.addCourseButton.click({ force: true })
    await expect(this.page).toHaveURL(/\/content\/courses\/new(?:\?|$)/)
    await expect(this.courseDialog).toBeVisible({ timeout: 30000 })

    await this.titleInput.fill(title)
    await this.selectRandomHost()

    const saveResponse = await this.saveCourseChanges()
    const courseId = Number(saveResponse?.Value?.Id)

    if (!courseId) {
      throw new Error(`Course creation did not return a course id: ${JSON.stringify(saveResponse)}`)
    }

    await this.openCourse(courseId)
    await expect(this.titleInput).toHaveValue(title)

    return courseId
  }

  async uploadCourseImages(largeImagePath: string, smallImagePath: string) {
    await this.largeImageInput.setInputFiles(largeImagePath)
    await expect(this.saveChangesButton).toBeEnabled({ timeout: 15000 })
    await this.saveCourseChanges()
    await this.openCurrentCourse()

    await this.smallImageInput.setInputFiles(smallImagePath)
    await expect(this.saveChangesButton).toBeEnabled({ timeout: 15000 })
    await this.saveCourseChanges()
  }

  async saveCourseChanges() {
    await expect(this.saveChangesButton).toBeEnabled({ timeout: 30000 })

    const saveResponsePromise = this.page.waitForResponse(
      (response) => /\/api\/.*courses/i.test(response.url()) && ['POST', 'PUT'].includes(response.request().method()),
      { timeout: 30000 },
    )

    await this.saveChangesButton.click({ force: true })
    const saveResponse = await saveResponsePromise
    const responseBody = await saveResponse.json().catch(() => null)

    if (responseBody?.WasSuccessful === false) {
      throw new Error(`Course save failed: ${JSON.stringify(responseBody)}`)
    }

    return responseBody
  }

  async assertAllLocationsSelected() {
    await expect(this.allLocationsButton).toHaveAttribute('aria-pressed', 'true')
  }

  async openLessons() {
    await this.lessonsTab.click({ force: true })
    await expect(this.courseDialog.getByRole('button', { name: 'Add lesson' })).toBeVisible({ timeout: 30000 })
  }

  async openMembers() {
    await this.membersTab.click({ force: true })
    await expect(this.courseDialog.getByRole('button', { name: 'Add member' })).toBeVisible({ timeout: 30000 })
  }

  async expectTextVisible(text: string) {
    await expect(this.courseDialog.getByText(text, { exact: true })).toBeVisible({ timeout: 30000 })
  }

  async expectTextContaining(text: string) {
    await expect(this.courseDialog.getByText(text)).toBeVisible({ timeout: 30000 })
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

  private async openCurrentCourse() {
    const coursePath = new URL(this.page.url()).pathname
    await this.page.goto(coursePath)
    await this.dismissBlockingDialogs()
    await expect(this.courseDialog).toBeVisible({ timeout: 30000 })
  }
}
