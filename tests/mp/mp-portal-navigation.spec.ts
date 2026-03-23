import { expect, test, type Page } from '@playwright/test'
import { MPHomePage } from '../../page-objects/mp/MPHomePage'
import { MPLoginPage } from '../../page-objects/mp/MPLoginPage'
import { MPPortalPage } from '../../page-objects/mp/MPPortalPage'
import { getConfiguredLocationSelectorLabel, getConfiguredUserCredentials } from '../../test-environments'

test.describe('MP authenticated portal navigation', () => {
  let currentBusinessName: string
  let currentUserFullName: string
  let homePage: MPHomePage
  let loginPage: MPLoginPage
  let portalPage: MPPortalPage
  const hasDedicatedMemberCredentials =
    Boolean(process.env.NEXUDUS_MEMBER_EMAIL?.trim()) && Boolean(process.env.NEXUDUS_MEMBER_PASSWORD?.trim())

  test.beforeEach(async ({ page }) => {
    test.skip(
      process.env.CI === 'true' && !hasDedicatedMemberCredentials,
      'MP authenticated portal navigation requires a dedicated non-admin member account in NEXUDUS_MEMBER_EMAIL and NEXUDUS_MEMBER_PASSWORD when running in CI.',
    )

    homePage = new MPHomePage(page)
    loginPage = new MPLoginPage(page)
    portalPage = new MPPortalPage(page)

    await portalPage.installBlockingDialogSuppression()
    const memberCredentials = getConfiguredUserCredentials('member')

    currentBusinessName = getConfiguredLocationSelectorLabel('mp')

    expect(currentBusinessName, 'Expected the MP location configuration to expose a business name.').toBeTruthy()

    await loginPage.login(memberCredentials.email, memberCredentials.password)
    await loginPage.assertDashboardVisible()
    await portalPage.dismissOnboardingModalIfPresent()

    currentUserFullName = await loginPage.getDashboardGreetingName()
    expect(currentUserFullName, 'Expected the MP dashboard greeting to expose the current member name.').toBeTruthy()
  })

  test('user-profile-menu shows the current member actions and hides legacy-only entries @dg', async ({ page }) => {
    await portalPage.openProfileMenu(currentUserFullName)

    await expect(page.getByText('This account has administrator rights.')).not.toBeVisible()

    for (const entry of ['Profile', 'Plans and Benefits', 'Bookings', 'Billing', 'Metrics', 'Refer a friend', 'Log out']) {
      await portalPage.assertProfileMenuEntryVisible(entry)
    }

    for (const legacyOnlyEntry of ['Access dashboard', 'Switch account', 'Page Editor']) {
      await portalPage.assertProfileMenuEntryNotVisible(legacyOnlyEntry)
    }
  })

  test('access dashboard returns to the dashboard from another member page @dg', async ({ page }) => {
    await portalPage.clickSidebarItem('My activity')
    await expect(page).toHaveURL(/\/my-activity(?:\?.*)?$/)
    await portalPage.assertMainHeadingVisible('My Activity')

    const dashboardSidebarLabel = (await portalPage.hasSidebarItem('My dashboard')) ? 'My dashboard' : 'Dashboard'

    await portalPage.clickSidebarItem(dashboardSidebarLabel)

    await expect(page).toHaveURL(/\/home(?:\?.*)?$/)
    await loginPage.assertDashboardVisible(currentUserFullName)
  })

  test('access invoices opens the billing area and the invoices controls @dg', async ({ page }) => {
    await portalPage.clickProfileMenuEntry(currentUserFullName, 'Billing')

    await expect(page).toHaveURL(/\/account\/billing(?:\?.*)?$/)
    await expect(page).toHaveTitle(/Billing/i)
    await portalPage.assertMainHeadingVisible('Billing')

    await portalPage.clickMainItem('Invoices')
    await portalPage.assertMainHeadingVisible('Invoices and payments')
    await portalPage.assertMainControlVisible('Payment details')
  })

  test('access bookings opens the bookings experience and keeps the booking filters visible @dg', async ({ page }) => {
    await portalPage.clickSidebarItem('Bookings')

    await expect(page).toHaveURL(/\/bookings(?:\?.*)?$/)
    await expect(page).toHaveTitle(/Bookings/i)
    await portalPage.assertMainControlVisible('All Resources')
  })

  test('access my plans opens the plans and benefits area @dg', async ({ page }) => {
    await portalPage.clickProfileMenuEntry(currentUserFullName, 'Plans and Benefits')

    await expect(page).toHaveURL(/\/account\/plan(?:\?.*)?$/)
    await expect(page).toHaveTitle(/Plans and Benefits/i)
    await portalPage.assertMainHeadingVisible('Plans and Benefits')
    await portalPage.assertMainTextVisible('Current plan')
  })

  test('access help & support opens FAQ and help request from the support menu @dg', async ({ page }) => {
    await portalPage.clickSidebarItem('Support')
    await portalPage.assertSidebarItemVisible('FAQ')
    await portalPage.assertSidebarItemVisible('Help request')

    await portalPage.clickSidebarItem('FAQ')
    await expect(page).toHaveURL(/\/faq(?:\?.*)?$/)
    await expect(page).toHaveTitle(/Frequently Asked Questions/i)
    await portalPage.assertMainHeadingVisible('Frequently Asked Questions')

    await portalPage.clickSidebarItem('Support')
    await portalPage.clickSidebarItem('Help request')
    await expect(page).toHaveURL(/\/support(?:\?.*)?$/)
    await expect(page).toHaveTitle(/Help Request/i)
    await portalPage.assertMainHeadingVisible('Help requests')
  })

  test('access settings opens notifications and exposes the current settings pages @dg', async ({ page }) => {
    await portalPage.clickSidebarItem('Settings')

    for (const entry of ['Notifications', 'Security', 'Integrations', 'Language']) {
      await portalPage.assertSidebarItemVisible(entry)
    }

    await portalPage.clickSidebarItem('Notifications')
    await expect(page).toHaveURL(/\/settings\/notifications(?:\?.*)?$/)
    await expect(page).toHaveTitle(/Notifications/i)
    await portalPage.assertMainHeadingVisible('Notifications')
    await portalPage.assertMainTextVisible('When to receive notifications')
  })

  test('access my activity drills through the current member activity tabs @dg', async ({ page }) => {
    await portalPage.clickSidebarItem('My activity')

    await expect(page).toHaveURL(/\/my-activity(?:\?.*)?$/)
    await expect(page).toHaveTitle(/My Activity/i)
    await portalPage.assertMainHeadingVisible('My Activity')
    await portalPage.assertMainHeadingVisible('Bookings')
    await portalPage.assertMainTextNotVisible('Invoices')

    const activityTabs = [
      { heading: 'Visitors', label: 'Visitors', urlPattern: /[?&]tab=Visitors(?:&|$)/ },
      { heading: 'Deliveries', label: 'Deliveries', urlPattern: /[?&]tab=Deliveries(?:&|$)/ },
      { heading: 'Events', label: 'Events', urlPattern: /[?&]tab=Events(?:&|$)/ },
      { heading: 'Courses', label: 'Courses', urlPattern: /[?&]tab=Courses(?:&|$)/ },
    ]
    const visibleActivityTabs = []

    for (const activityTab of activityTabs) {
      if (await portalPage.hasMainControl(activityTab.label)) {
        visibleActivityTabs.push(activityTab)
      }
    }

    expect(
      visibleActivityTabs.length,
      'Expected the current member activity view to expose multiple activity tabs beyond the default bookings view.',
    ).toBeGreaterThanOrEqual(2)

    for (const activityTab of visibleActivityTabs) {
      await portalPage.clickMainItem(activityTab.label)
      await expect(page).toHaveURL(activityTab.urlPattern)
      await portalPage.assertMainHeadingVisible(activityTab.heading)
    }
  })

  test('access building opens availability and confirms environment is not exposed in the current member navigation @dg', async ({
    page,
  }) => {
    await portalPage.clickSidebarItem('Building')
    await portalPage.assertSidebarItemVisible('Availability')
    await portalPage.assertSidebarItemNotVisible('Environment')

    await portalPage.clickSidebarItem('Availability')
    await expect(page).toHaveURL(/\/my-building\/capacity(?:\?.*)?$/)
    await expect(page).toHaveTitle(/Availability/i)
    await portalPage.assertMainHeadingVisible('Availability')
  })

  test('access account opens the current profile page and confirms the legacy account tabs are not exposed @dg', async ({
    page,
  }) => {
    await portalPage.clickProfileMenuEntry(currentUserFullName, 'Profile')

    await expect(page).toHaveURL(/\/account\/profile(?:\?.*)?$/)
    await expect(page).toHaveTitle(/Profile/i)
    await portalPage.assertMainHeadingVisible('Profile')
    await portalPage.assertMainHeadingVisible('Personal details')
    await portalPage.assertMainHeadingVisible('Personal Address')
    await portalPage.assertMainHeadingVisible('Social networks')

    for (const legacyAccountTab of ['Billing details', 'Plans and benefits', 'Directory profile', 'Identity checks', 'Files']) {
      await portalPage.assertMainTextNotVisible(legacyAccountTab)
    }
  })

  test('sign out returns to an anonymous MP page with public entry points back into the portal @dg', async ({ page }) => {
    await portalPage.clickProfileMenuEntry(currentUserFullName, 'Log out')
    const loggedOutSurface = await waitForAnonymousPortalSurface({
      homePage,
      loginPage,
      page,
    })

    if (loggedOutSurface === 'login') {
      await expect
        .poll(async () => decodeURIComponent(page.url()), {
          message: 'Expected the logged-out login page to preserve a returnUrl back to the public MP home page.',
        })
        .toContain('/home')

      await loginPage.assertAnonymousEntryPointsVisible(currentBusinessName)
      await loginPage.assertLoggedOutFooterVisible(currentBusinessName)
    } else {
      await homePage.dismissStartupNoticeIfPresent()
      await homePage.assertPublicMarketingEntryPointsVisible(currentBusinessName)
      await homePage.assertFooterBrandingVisible(currentBusinessName)
    }

    await expect(
      page.getByRole('button', { name: new RegExp(currentUserFullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first(),
    ).not.toBeVisible()
  })

  test('access marketing uses the anonymous brand link to reach or keep the public member home page @dg', async ({ page }) => {
    await portalPage.clickProfileMenuEntry(currentUserFullName, 'Log out')
    const loggedOutSurface = await waitForAnonymousPortalSurface({
      homePage,
      loginPage,
      page,
    })

    if (loggedOutSurface === 'login') {
      await loginPage.assertAnonymousEntryPointsVisible(currentBusinessName)
      await loginPage.goToMarketingHomeFromBrandLink(currentBusinessName)
    } else {
      await homePage.dismissStartupNoticeIfPresent()
      await homePage.clickAnonymousBrandLink(currentBusinessName)
    }

    await expect
      .poll(async () => /\/(?:home)?(?:\?.*)?$/.test(page.url()), {
        message: 'Expected the anonymous brand link to keep or return the user to the public MP home page.',
      })
      .toBe(true)
    await homePage.dismissStartupNoticeIfPresent()
    await homePage.assertPublicMarketingEntryPointsVisible(currentBusinessName)
    await homePage.assertFooterBrandingVisible(currentBusinessName)
  })
})

async function waitForAnonymousPortalSurface({
  homePage,
  loginPage,
  page,
}: {
  homePage: MPHomePage
  loginPage: MPLoginPage
  page: Page
}): Promise<'home' | 'login'> {
  const timeoutAt = Date.now() + 20_000
  let lastUrl = ''

  while (Date.now() < timeoutAt) {
    lastUrl = page.url()

    const loginFormVisible = await loginPage.emailInput.isVisible().catch(() => false)
    const signInVisible = await loginPage.signInButton.isVisible().catch(() => false)

    if (/\/login(?:\?.*)?$/.test(lastUrl) && (loginFormVisible || signInVisible)) {
      return 'login'
    }

    if (/\/home(?:\?.*)?$/.test(lastUrl)) {
      await homePage.dismissStartupNoticeIfPresent()

      const headerSignInVisible = await homePage.headerSignInLink.isVisible().catch(() => false)
      const heroSignInVisible = await homePage.heroSignInLink.isVisible().catch(() => false)

      if (headerSignInVisible || heroSignInVisible) {
        return 'home'
      }
    }

    await page.waitForTimeout(250)
  }

  throw new Error(`Expected logout to return the user to a stable anonymous MP page. Last URL: ${lastUrl || page.url()}.`)
}
