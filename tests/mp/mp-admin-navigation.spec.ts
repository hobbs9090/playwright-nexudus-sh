import { expect, test } from '@playwright/test'
import { MPLoginPage } from '../../page-objects/mp/MPLoginPage'
import { MPPortalPage } from '../../page-objects/mp/MPPortalPage'
import { getConfiguredUserCredentials } from '../../test-environments'

test.describe('MP admin portal navigation', () => {
  let adminDisplayName: string
  let loginPage: MPLoginPage
  let portalPage: MPPortalPage

  test.beforeEach(async ({ page }) => {
    test.skip(
      !process.env.NEXUDUS_ADMIN_EMAIL?.trim() || !process.env.NEXUDUS_ADMIN_PASSWORD?.trim(),
      'MP admin portal navigation requires a dedicated MP-registered admin user in NEXUDUS_ADMIN_EMAIL and NEXUDUS_ADMIN_PASSWORD.',
    )

    const adminCredentials = getConfiguredUserCredentials('admin')

    loginPage = new MPLoginPage(page)
    portalPage = new MPPortalPage(page)

    await portalPage.installBlockingDialogSuppression()
    await loginPage.login(adminCredentials.email, adminCredentials.password)
    await loginPage.assertDashboardVisible()
    await portalPage.dismissOnboardingModalIfPresent()

    adminDisplayName = await loginPage.getDashboardGreetingName()
    expect(adminDisplayName, 'Expected the admin dashboard greeting to expose a name fragment for the profile menu button.').toBeTruthy()
  })

  test('user-profile-menu exposes the current admin-only actions', async ({ page }) => {
    await portalPage.openProfileMenu(adminDisplayName)

    await expect(page.getByText('This account has administrator rights.')).toBeVisible()

    for (const adminEntry of ['Admin', 'Page Editor', 'Switch account']) {
      await portalPage.assertProfileMenuEntryVisible(adminEntry)
    }

    for (const sharedEntry of ['Access dashboard', 'Profile', 'Log out']) {
      await portalPage.assertProfileMenuEntryVisible(sharedEntry)
    }
  })
})
