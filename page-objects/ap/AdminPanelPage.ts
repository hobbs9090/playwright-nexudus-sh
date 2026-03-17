import { expect, Locator, Page } from '@playwright/test'
import { AbstractPage } from '../shared/AbstractPage'

type WorkflowExpectation = {
  actionButton?: string
  bodyTexts: Array<string | RegExp>
  path: string
  urlPattern: RegExp
}

export class AdminPanelPage extends AbstractPage {
  readonly body: Locator
  readonly dashboardLink: Locator
  readonly crmLink: Locator
  readonly communityLink: Locator
  readonly financeLink: Locator
  readonly operationsLink: Locator
  readonly inventoryLink: Locator
  readonly tasksLink: Locator
  readonly helpDeskLink: Locator
  readonly enquiriesLink: Locator
  readonly analyticsLink: Locator

  constructor(page: Page) {
    super(page)
    this.body = page.locator('body')
    this.dashboardLink = page.getByRole('link', { name: 'Dashboard', exact: true }).first()
    this.crmLink = page.getByRole('link', { name: 'CRM', exact: true }).first()
    this.communityLink = page.getByRole('link', { name: 'Community', exact: true }).first()
    this.financeLink = page.getByRole('link', { name: 'Finance', exact: true }).first()
    this.operationsLink = page.getByRole('link', { name: 'Operations', exact: true }).first()
    this.inventoryLink = page.getByRole('link', { name: 'Inventory', exact: true }).first()
    this.tasksLink = page.getByRole('link', { name: 'Tasks', exact: true }).first()
    this.helpDeskLink = page.getByRole('link', { name: /^Help-desk/ }).first()
    this.enquiriesLink = page.getByRole('link', { name: 'Enquiries', exact: true }).first()
    this.analyticsLink = page.getByRole('link', { name: 'Analytics', exact: true }).first()
  }

  async navigateTo(path: string) {
    await this.page.goto(path)
    await this.dismissBlockingDialogs()
    await this.page.waitForTimeout(1000)
  }

  async expectPrimaryNavigation() {
    const navigationItems = [
      this.dashboardLink,
      this.crmLink,
      this.communityLink,
      this.financeLink,
      this.operationsLink,
      this.inventoryLink,
      this.tasksLink,
      this.helpDeskLink,
      this.enquiriesLink,
      this.analyticsLink,
    ]

    for (const navigationItem of navigationItems) {
      await expect(navigationItem).toBeVisible()
    }
  }

  async expectBodyTexts(texts: Array<string | RegExp>) {
    for (const text of texts) {
      await expect(this.body).toContainText(text)
    }
  }

  async expectSectionOverview(path: string, texts: Array<string | RegExp>) {
    await this.navigateTo(path)
    await this.expectBodyTexts(texts)
  }

  async expectWorkflowPage({ path, urlPattern, actionButton, bodyTexts }: WorkflowExpectation) {
    await this.navigateTo(path)
    await expect(this.page).toHaveURL(urlPattern)

    if (actionButton) {
      await expect(this.page.getByRole('button', { name: actionButton })).toBeVisible()
    }

    await this.expectBodyTexts(bodyTexts)
  }
}
