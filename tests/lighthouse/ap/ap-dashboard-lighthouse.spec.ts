import { test } from '@playwright/test'
import { APLoginPage } from '../../../page-objects/ap/APLoginPage'
import { runAuthenticatedLighthouseAudit } from '../support'

test.describe('AP Lighthouse', () => {
  test('audits the authenticated AP dashboard @lighthouse', async ({}, testInfo) => {
    test.slow()

    const baseURL = testInfo.project.use.baseURL

    if (typeof baseURL !== 'string' || !baseURL.trim()) {
      throw new Error('AP Lighthouse project is missing a baseURL.')
    }

    await runAuthenticatedLighthouseAudit({
      auditName: 'ap-dashboard',
      baseURL,
      testInfo,
      authenticate: async (page) => {
        const loginPage = new APLoginPage(page)

        await loginPage.login()
        await loginPage.assertDashboardVisible()
      },
    })
  })
})
