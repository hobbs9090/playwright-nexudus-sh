import { test } from '@playwright/test'
import { generateUniqueName, getContributorInitials } from '../../helpers'
import { MPHelpRequestInput, MPHelpRequestsPage } from '../../page-objects/mp/MPHelpRequestsPage'
import { MPLoginPage } from '../../page-objects/mp/MPLoginPage'

function createHelpRequest(): MPHelpRequestInput {
  const subject = generateUniqueName('Playwright help request', getContributorInitials())

  return {
    subject,
    message: `This is a seeded Playwright MP help-request test for "${subject}". Please ignore this staged support request.`,
  }
}

test.describe('MP help requests', () => {
  let helpRequestsPage: MPHelpRequestsPage
  let loginPage: MPLoginPage

  test.beforeEach(async ({ page }) => {
    helpRequestsPage = new MPHelpRequestsPage(page)
    loginPage = new MPLoginPage(page)
    await loginPage.login()
  })

  test('can submit a seeded help request and reopen it from the help-request list', async () => {
    test.slow()
    const helpRequest = createHelpRequest()

    await helpRequestsPage.gotoList()
    await helpRequestsPage.openNewHelpRequestForm()
    await helpRequestsPage.submitHelpRequest(helpRequest)
    await helpRequestsPage.assertHelpRequestListed(helpRequest.subject)
    await helpRequestsPage.openHelpRequest(helpRequest.subject)
    await helpRequestsPage.assertHelpRequestDetails(helpRequest)
  })
})
