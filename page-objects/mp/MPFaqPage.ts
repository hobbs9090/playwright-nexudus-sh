import { expect, Locator, Page } from '@playwright/test'
import { AbstractPage } from '../shared/AbstractPage'

export class MPFaqPage extends AbstractPage {
  readonly faqArticleTitles: Locator
  readonly faqHeading: Locator
  readonly main: Locator
  readonly readMoreLinks: Locator
  readonly sectionHeadings: Locator

  constructor(page: Page) {
    super(page)
    this.main = page.getByRole('main')
    this.faqHeading = this.main.getByRole('heading', { name: 'Frequently Asked Questions' }).first()
    this.sectionHeadings = this.main.locator('h5')
    this.readMoreLinks = this.main.getByRole('link', { name: 'Read more' })
    this.faqArticleTitles = this.main.locator('a[href*="/faq/"] strong')
  }

  async assertLandingPageVisible() {
    await expect(this.faqHeading).toBeVisible()
    await expect(this.sectionHeadings.first()).toBeVisible()
    await expect(this.faqArticleTitles.first()).toBeVisible()
    await expect(this.readMoreLinks.first()).toBeVisible()
  }
}
