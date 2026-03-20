import { test } from '@playwright/test'
import { MPHelpRequestsPage } from '../../page-objects/mp/MPHelpRequestsPage'
import { MPLoginPage } from '../../page-objects/mp/MPLoginPage'

function buildUniqueHelpRequestSubject() {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return `Playwright MP help request ${uniqueSuffix}`
}

test.describe('MP help requests', () => {
  let helpRequestsPage: MPHelpRequestsPage
  let loginPage: MPLoginPage

  test.beforeEach(async ({ page }) => {
    helpRequestsPage = new MPHelpRequestsPage(page)
    loginPage = new MPLoginPage(page)
    await loginPage.login()
  })

  test('creates a help request for the configured MP member', async () => {
    const subject = buildUniqueHelpRequestSubject()

    await helpRequestsPage.createHelpRequest({
      message: 'This automated request verifies that signed-in members can submit support issues from the MP support area.',
      subject,
    })
  })
})
