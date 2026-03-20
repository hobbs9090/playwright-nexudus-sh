import { test } from '@playwright/test'
import { generateUniqueName, getContributorInitials } from '../../helpers'
import { MPHelpRequestsPage } from '../../page-objects/mp/MPHelpRequestsPage'
import { MPLoginPage } from '../../page-objects/mp/MPLoginPage'

function buildUniqueHelpRequestSubject() {
  return generateUniqueName('Playwright MP help request', getContributorInitials())
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
