import type { NexudusCurrentUserResponse } from '../../api/NexudusApiClient'
import { getConfiguredBaseURL } from '../../nexudus-config'
import { MPHomePage } from '../../page-objects/mp/MPHomePage'
import { MPLoginPage } from '../../page-objects/mp/MPLoginPage'
import { expect, test } from './api-test'

type FooterHeadingExpectation = {
  candidateLabels: string[]
  requestedLabel: string
}

type FooterLanguageExpectation = {
  candidateLabels: string[]
  requestedLabel: string
}

const footerHeadingExpectations: FooterHeadingExpectation[] = [
  { requestedLabel: 'Contact', candidateLabels: ['Contact', 'Company'] },
  { requestedLabel: 'Services', candidateLabels: ['Services', 'Explore'] },
  { requestedLabel: 'Help', candidateLabels: ['Help', 'Support'] },
]

const footerLinkLabels = [
  'Account',
  'Bookings Calendar',
  'Contact',
  'Events',
  'Directory',
  'Discussion Boards',
  'Articles',
  'FAQ',
  'Help',
  'Terms and conditions',
  'Privacy policy',
  'Cookies policy',
]

const footerLanguageExpectations: FooterLanguageExpectation[] = [
  { requestedLabel: 'Spanish', candidateLabels: ['Spanish', 'Español'] },
  { requestedLabel: 'English (US)', candidateLabels: ['English (US)'] },
  { requestedLabel: 'English (Int.)', candidateLabels: ['English (Int.)', 'English (GB)'] },
]

test.describe('MP footer and social settings', () => {
  test.describe.configure({ mode: 'serial' })

  let currentBusinessId: number
  let currentBusinessName: string
  let currentUserFullName: string
  let homePage: MPHomePage
  let loginPage: MPLoginPage

  test.beforeEach(async ({ accessToken, nexudusApi, page }) => {
    expect(accessToken.trim(), 'Expected the API suite beforeEach to retrieve a bearer token before each test.').toBeTruthy()

    const currentUser = await nexudusApi.getCurrentUser(accessToken)

    currentBusinessId = getCurrentBusinessId(currentUser)
    currentBusinessName = getCurrentBusinessName(currentUser)
    currentUserFullName = getCurrentUserFullName(currentUser)
    homePage = new MPHomePage(page)
    loginPage = new MPLoginPage(page)
  })

  test('Footer.Links opens the marketing page and shows the expected footer headings and links @api', async () => {
    await homePage.goto(buildCacheBustedMPURL('/home'))

    for (const footerHeadingExpectation of footerHeadingExpectations) {
      await test.step(`assert footer heading ${footerHeadingExpectation.requestedLabel}`, async () => {
        await homePage.assertFooterHeadingVisible(...footerHeadingExpectation.candidateLabels)
      })
    }

    await homePage.assertFooterBrandingVisible(currentBusinessName)
    await homePage.assertFooterLinksVisible(footerLinkLabels)
  })

  test('Footer.Login signs in from the footer account flow and shows the dashboard footer controls @api', async ({
    page,
  }) => {
    await homePage.goto(buildCacheBustedMPURL('/home'))
    await expect(homePage.footer).toContainText(`${new Date().getFullYear()} © ${currentBusinessName}. All rights reserved.`)
    await expect(homePage.footerLanguageSelector).toBeVisible()
    await homePage.clickFooterLink('Account')

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/)

    await loginPage.submitCurrentLoginForm(undefined, undefined, 'success')

    const returnHomeLink = page.getByRole('link', { name: 'Return home' })
    const wrongTurnVisible = await returnHomeLink.isVisible().catch(() => false)

    if (wrongTurnVisible) {
      await returnHomeLink.click()
    }

    await homePage.goto(buildCacheBustedMPURL('/home'))
    await loginPage.assertDashboardVisible(currentUserFullName)
  })

  test('Footer.Language changes the footer language selector to one of the requested languages @api', async () => {
    await homePage.goto(buildCacheBustedMPURL('/home'))

    const currentLanguageLabel = await homePage.getSelectedFooterLanguageLabel()
    const selectedLanguage = selectFooterLanguageExpectation(currentLanguageLabel)
    const selectedLabel = await homePage.selectFooterLanguage(selectedLanguage.candidateLabels)

    expect(
      selectedLanguage.candidateLabels.includes(selectedLabel),
      `Expected the footer language selector to show one of ${selectedLanguage.candidateLabels.join(', ')}.`,
    ).toBeTruthy()
  })
})

function buildCacheBustedMPURL(path: string) {
  const url = new URL(path, getConfiguredBaseURL('NEXUDUS_MP_BASE_URL'))
  url.searchParams.set('playwright_footer_suite', Date.now().toString())

  return url.toString()
}

function getCurrentBusinessId(currentUser: NexudusCurrentUserResponse) {
  const currentBusinessId = Number(currentUser.DefaultBusinessId)

  expect(
    Number.isInteger(currentBusinessId) && currentBusinessId > 0,
    'Expected the current API user profile to expose a numeric default business id.',
  ).toBeTruthy()

  return currentBusinessId
}

function getCurrentBusinessName(currentUser: NexudusCurrentUserResponse) {
  const currentBusinessName = String(currentUser.DefaultBusinessName || '').trim()

  expect(currentBusinessName, 'Expected the current API user profile to expose a default business name.').toBeTruthy()

  return currentBusinessName
}

function getCurrentUserFullName(currentUser: NexudusCurrentUserResponse) {
  const currentUserFullName = String(currentUser.FullName || '').trim()

  expect(currentUserFullName, 'Expected the current API user profile to expose the current user full name.').toBeTruthy()

  return currentUserFullName
}

function selectFooterLanguageExpectation(currentLanguageLabel: string) {
  return (
    footerLanguageExpectations.find((languageExpectation) =>
      languageExpectation.candidateLabels.every((candidateLabel) => candidateLabel !== currentLanguageLabel),
    ) || footerLanguageExpectations[0]
  )
}
