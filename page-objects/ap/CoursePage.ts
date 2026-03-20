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
    const largeImageSaved = await this.setCourseImage(this.largeImageInput, largeImagePath)

    if (largeImageSaved) {
      await this.saveCourseChanges()
    }

    await this.openCurrentCourse()

    const smallImageSaved = await this.setCourseImage(this.smallImageInput, smallImagePath)

    if (smallImageSaved) {
      await this.saveCourseChanges()
    }

    return {
      largeImageSaved,
      smallImageSaved,
    }
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
    await expect(this.courseDialog.getByText(text).first()).toBeVisible({ timeout: 30000 })
  }

  async isCourseVisible(title: string) {
    await this.navigateToList()
    return this.page.getByText(title, { exact: true }).isVisible().catch(() => false)
  }

  async selectRandomHost() {
    await this.hostOptionsButton.click()

    const hostOptions = this.page.getByRole('option')
    await expect(hostOptions.first()).toBeVisible({ timeout: 15000 })

    const hostNames = (await hostOptions.allTextContents()).map((hostName) => hostName.trim()).filter(Boolean)
    expect(hostNames, 'Expected at least one AP course host option to be available.').not.toHaveLength(0)

    const randomIndex = Math.floor(Math.random() * hostNames.length)
    const selectedHostName = hostNames[randomIndex]

    await this.hostCombobox.click()

    for (let optionIndex = 0; optionIndex <= randomIndex; optionIndex += 1) {
      await this.page.keyboard.press('ArrowDown')
    }

    await this.page.keyboard.press('Enter')
    await expect(hostOptions.first()).toBeHidden({ timeout: 15000 })
    await expect.poll(() => this.hostCombobox.inputValue(), { timeout: 15000 }).not.toBe('')
    const selectedHostValue = await this.hostCombobox.inputValue()

    expect(
      hostNames.some((hostName) => hostName === selectedHostValue || hostName.startsWith(selectedHostValue)),
      `Expected the selected AP course host "${selectedHostValue}" to match one of the available options.`,
    ).toBe(true)
  }

  private async openCurrentCourse() {
    const coursePath = new URL(this.page.url()).pathname
    await this.page.goto(coursePath)
    await this.dismissBlockingDialogs()
    await expect(this.courseDialog).toBeVisible({ timeout: 30000 })
  }

  private async setCourseImage(imageInput: Locator, imagePath: string) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      await imageInput.setInputFiles([])
      await imageInput.setInputFiles(imagePath)

      if (await this.isSaveChangesButtonEnabled()) {
        return true
      }

      if (attempt === 1) {
        await this.openCurrentCourse()
      }
    }

    return false
  }

  private async isSaveChangesButtonEnabled() {
    try {
      await expect.poll(() => this.saveChangesButton.isEnabled(), { timeout: 5000 }).toBe(true)
      return true
    } catch {
      return false
    }
  }
}
