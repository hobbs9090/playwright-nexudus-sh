import { expect, test } from '@playwright/test'
import { NexudusApiClient } from '../../api/NexudusApiClient'
import { MPHomePage } from '../../page-objects/mp/MPHomePage'
import { MPLoginPage } from '../../page-objects/mp/MPLoginPage'
import { MPPortalPage } from '../../page-objects/mp/MPPortalPage'

test.describe('MP authenticated portal navigation', () => {
  let currentBusinessName: string
  let currentUserFullName: string
  let homePage: MPHomePage
  let loginPage: MPLoginPage
  let portalPage: MPPortalPage

  test.beforeEach(async ({ page, request }) => {
    homePage = new MPHomePage(page)
    loginPage = new MPLoginPage(page)
    portalPage = new MPPortalPage(page)

    await portalPage.installBlockingDialogSuppression()

    const nexudusApi = new NexudusApiClient(request)
    const token = await nexudusApi.createBearerToken()
    const currentUser = await nexudusApi.getCurrentUser(token.access_token)

    currentBusinessName = String(currentUser.DefaultBusinessName || '').trim()
    currentUserFullName = String(currentUser.FullName || '').trim()

    expect(currentBusinessName, 'Expected the MP API profile to expose a business name.').toBeTruthy()
    expect(currentUserFullName, 'Expected the MP API profile to expose the current user full name.').toBeTruthy()

    await loginPage.login()
    await loginPage.assertDashboardVisible(currentUserFullName)
    await portalPage.dismissOnboardingModalIfPresent()
  })

  test('user-profile-menu shows the current member actions and hides legacy-only entries', async ({ page }) => {
    await portalPage.openProfileMenu(currentUserFullName)

    await expect(page.getByText('This account has administrator rights.')).toBeVisible()

    for (const entry of ['Access dashboard', 'Profile', 'Plans and Benefits', 'Bookings', 'Visitors', 'Billing', 'Metrics', 'Log out']) {
      await portalPage.assertProfileMenuEntryVisible(entry)
    }

    for (const legacyOnlyEntry of ['Switch account', 'Page Editor']) {
      await portalPage.assertProfileMenuEntryNotVisible(legacyOnlyEntry)
    }
  })

  test('access dashboard returns to the dashboard from another member page', async ({ page }) => {
    await portalPage.clickSidebarItem('My activity')
    await expect(page).toHaveURL(/\/my-activity(?:\?.*)?$/)
    await portalPage.assertMainHeadingVisible('My Activity')

    await portalPage.clickSidebarItem('Dashboard')
    await portalPage.clickSidebarItem('Individual')

    await expect(page).toHaveURL(/\/home(?:\?.*)?$/)
    await loginPage.assertDashboardVisible(currentUserFullName)
  })

  test('access invoices opens the billing area and the invoices controls', async ({ page }) => {
    await portalPage.clickProfileMenuEntry(currentUserFullName, 'Billing')

    await expect(page).toHaveURL(/\/account\/billing(?:\?.*)?$/)
    await expect(page).toHaveTitle(/Billing/i)
    await portalPage.assertMainHeadingVisible('Billing')

    await portalPage.clickMainItem('Invoices')
    await portalPage.assertMainHeadingVisible('Invoices and payments')
    await portalPage.assertMainControlVisible('Payment details')
  })

  test('access bookings opens the bookings experience and keeps the booking filters visible', async ({ page }) => {
    await portalPage.clickSidebarItem('Bookings')

    await expect(page).toHaveURL(/\/bookings(?:\?.*)?$/)
    await expect(page).toHaveTitle(/Bookings/i)
    await portalPage.assertMainControlVisible('All Resources')
  })

  test('access my plans opens the plans and benefits area', async ({ page }) => {
    await portalPage.clickProfileMenuEntry(currentUserFullName, 'Plans and Benefits')

    await expect(page).toHaveURL(/\/account\/plan(?:\?.*)?$/)
    await expect(page).toHaveTitle(/Plans and Benefits/i)
    await portalPage.assertMainHeadingVisible('Plans and Benefits')
    await portalPage.assertMainTextVisible('Current plan')
  })

  test('access help & support opens FAQ and help request from the support menu', async ({ page }) => {
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

  test('access settings opens notifications and exposes the current settings pages', async ({ page }) => {
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

  test('access my activity drills through the current member activity tabs', async ({ page }) => {
    await portalPage.clickSidebarItem('My activity')

    await expect(page).toHaveURL(/\/my-activity(?:\?.*)?$/)
    await expect(page).toHaveTitle(/My Activity/i)
    await portalPage.assertMainHeadingVisible('My Activity')
    await portalPage.assertMainHeadingVisible('Bookings')
    await portalPage.assertMainTextNotVisible('Invoices')

    for (const activityTab of [
      { heading: 'Visitors', label: 'Visitors', urlPattern: /[?&]tab=Visitors(?:&|$)/ },
      { heading: 'Deliveries', label: 'Deliveries', urlPattern: /[?&]tab=Deliveries(?:&|$)/ },
      { heading: 'Events', label: 'Events', urlPattern: /[?&]tab=Events(?:&|$)/ },
      { heading: 'Courses', label: 'Courses', urlPattern: /[?&]tab=Courses(?:&|$)/ },
    ]) {
      await portalPage.clickMainItem(activityTab.label)
      await expect(page).toHaveURL(activityTab.urlPattern)
      await portalPage.assertMainHeadingVisible(activityTab.heading)
    }
  })

  test('access building opens availability and confirms environment is not exposed in the current member navigation', async ({
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

  test('access account opens the current profile page and confirms the legacy account tabs are not exposed', async ({
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

  test('sign out returns to an anonymous MP page with public entry points back into the portal', async ({ page }) => {
    await portalPage.clickProfileMenuEntry(currentUserFullName, 'Log out')

    await expect
      .poll(
        async () => {
          const url = page.url()

          return /\/login(?:\?.*)?$/.test(url) || /\/home(?:\?.*)?$/.test(url)
        },
        {
          message: 'Expected logout to return the user to an anonymous MP page.',
        },
      )
      .toBe(true)

    if (/\/login(?:\?.*)?$/.test(page.url())) {
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

  test('access marketing uses the anonymous brand link to reach or keep the public member home page', async ({ page }) => {
    await portalPage.clickProfileMenuEntry(currentUserFullName, 'Log out')

    await expect
      .poll(async () => /\/login(?:\?.*)?$/.test(page.url()) || /\/home(?:\?.*)?$/.test(page.url()), {
        message: 'Expected logout to land on an anonymous MP route before using the brand link.',
      })
      .toBe(true)

    if (/\/login(?:\?.*)?$/.test(page.url())) {
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
