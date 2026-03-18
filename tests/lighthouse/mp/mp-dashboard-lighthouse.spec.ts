import { test } from '@playwright/test'
import { MPLoginPage } from '../../../page-objects/mp/MPLoginPage'
import { runAuthenticatedLighthouseAudit } from '../support'

test.describe('MP Lighthouse', () => {
  test('audits the authenticated MP dashboard @lighthouse', async ({}, testInfo) => {
    test.slow()

    const baseURL = testInfo.project.use.baseURL

    if (typeof baseURL !== 'string' || !baseURL.trim()) {
      throw new Error('MP Lighthouse project is missing a baseURL.')
    }

    await runAuthenticatedLighthouseAudit({
      auditName: 'mp-dashboard',
      baseURL,
      testInfo,
      authenticate: async (page) => {
        const loginPage = new MPLoginPage(page)

        await loginPage.login()
        await loginPage.assertDashboardVisible()
      },
    })
  })
})
