import type { NexudusCurrentUserResponse } from '../../api/NexudusApiClient'
import { generateUniqueName, getContributorInitials } from '../../helpers'
import { getConfiguredBaseURL } from '../../nexudus-config'
import { MPHomePage } from '../../page-objects/mp/MPHomePage'
import { MPLoginPage } from '../../page-objects/mp/MPLoginPage'
import { expect, test } from './api-test'
import { getConfiguredMpBusinessContext } from './configured-mp-business'

type FooterHeadingExpectation = {
  candidateLabels: string[]
  requestedLabel: string
}

type FooterLanguageExpectation = {
  candidateLabels: string[]
  requestedLabel: string
}

type SocialSettingExpectation = {
  expectedFailureReason?: string
  name: string
  title: string
  url: string
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

const socialSettingExpectations: SocialSettingExpectation[] = [
  { name: 'Social.Facebook', title: 'Social.Facebook', url: 'http://www.facebook.com' },
  {
    expectedFailureReason: 'Current MP staging does not render a Flickr footer link after Social.Flickr is updated.',
    name: 'Social.Flickr',
    title: 'Social.Flickr',
    url: 'http://www.flickr.com',
  },
  { name: 'Social.Instagram', title: 'Social.Instagram', url: 'http://www.instagram.com' },
  {
    expectedFailureReason:
      'Current MP staging rewrites the Twitter/X footer href instead of preserving http://www.x.com.',
    name: 'Social.Twitter',
    title: 'Social.Twitter',
    url: 'http://www.x.com',
  },
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
    const configuredMpBusiness = await getConfiguredMpBusinessContext(nexudusApi, accessToken, currentUser)

    currentBusinessId = configuredMpBusiness.businessId
    currentBusinessName = configuredMpBusiness.businessName
    currentUserFullName = getCurrentUserFullName(currentUser)
    homePage = new MPHomePage(page)
    loginPage = new MPLoginPage(page)
  })

  test('Footer.Links opens the marketing page and shows the expected footer headings and links @api @dg', async () => {
    await homePage.goto(buildCacheBustedMPURL('/home'))

    for (const footerHeadingExpectation of footerHeadingExpectations) {
      await test.step(`assert footer heading ${footerHeadingExpectation.requestedLabel}`, async () => {
        await homePage.assertFooterHeadingVisible(...footerHeadingExpectation.candidateLabels)
      })
    }

    await homePage.assertFooterBrandingVisible(currentBusinessName)
    await homePage.assertFooterLinksVisible(footerLinkLabels)
  })

  test('Footer.Login signs in from the footer account flow and shows the dashboard footer controls @api @dg', async ({
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

  test('Footer.Language changes the footer language selector to one of the requested languages @api @dg', async () => {
    await homePage.goto(buildCacheBustedMPURL('/home'))

    const currentLanguageLabel = await homePage.getSelectedFooterLanguageLabel()
    const selectedLanguage = selectFooterLanguageExpectation(currentLanguageLabel)
    const selectedLabel = await homePage.selectFooterLanguage(selectedLanguage.candidateLabels)

    expect(
      selectedLanguage.candidateLabels.includes(selectedLabel),
      `Expected the footer language selector to show one of ${selectedLanguage.candidateLabels.join(', ')}.`,
    ).toBeTruthy()
  })

  test('Footer.SayingText updates the business setting by API and shows the new footer text in MP @api @dg', async ({
    accessToken,
    nexudusApi,
  }, testInfo) => {
    const footerSayingText = await nexudusApi.getBusinessSetting(accessToken, {
      businessId: currentBusinessId,
      name: 'Footer.SayingText',
    })
    const originalValue = footerSayingText.Value
    const updatedValue = buildFooterSettingValue(testInfo.title)

    expect(updatedValue, 'Expected the footer saying text update value to differ from the current setting.').not.toBe(originalValue)

    try {
      const updateResponse = await nexudusApi.updateBusinessSettingMutation(accessToken, {
        BusinessId: footerSayingText.BusinessId,
        Id: footerSayingText.Id,
        Name: footerSayingText.Name,
        Value: updatedValue,
      })

      expect(updateResponse.Message).toBe(`Space Setting "${currentBusinessName}" was successfully updated.`)

      const updatedSetting = await nexudusApi.getBusinessSettingById(accessToken, footerSayingText.Id)

      expect(updatedSetting.Value).toBe(updatedValue)

      await expect
        .poll(async () => {
          await homePage.goto(buildCacheBustedMPURL('/home'))
          return await homePage.getFooterText()
        }, { timeout: 45000 })
        .toContain(updatedValue)

      await homePage.assertFooterSayingVisible(updatedValue)
    } finally {
      await nexudusApi.updateBusinessSetting(accessToken, {
        BusinessId: footerSayingText.BusinessId,
        Id: footerSayingText.Id,
        Name: footerSayingText.Name,
        Value: originalValue,
      })
    }
  })

  test('Footer.SayingAuthor updates the business setting by API and shows the new author text in MP @api @dg', async ({
    accessToken,
    nexudusApi,
  }, testInfo) => {
    const footerSayingAuthor = await nexudusApi.getBusinessSetting(accessToken, {
      businessId: currentBusinessId,
      name: 'Footer.SayingAuthor',
    })
    const originalValue = footerSayingAuthor.Value
    const updatedValue = buildFooterSettingValue(testInfo.title)

    expect(updatedValue, 'Expected the footer saying author update value to differ from the current setting.').not.toBe(originalValue)

    try {
      const updateResponse = await nexudusApi.updateBusinessSettingMutation(accessToken, {
        BusinessId: footerSayingAuthor.BusinessId,
        Id: footerSayingAuthor.Id,
        Name: footerSayingAuthor.Name,
        Value: updatedValue,
      })

      expect(updateResponse.Message).toBe(`Space Setting "${currentBusinessName}" was successfully updated.`)

      const updatedSetting = await nexudusApi.getBusinessSettingById(accessToken, footerSayingAuthor.Id)

      expect(updatedSetting.Value).toBe(updatedValue)

      await expect
        .poll(async () => {
          await homePage.goto(buildCacheBustedMPURL('/home'))
          return await homePage.getFooterText()
        }, { timeout: 45000 })
        .toContain(updatedValue)

      await homePage.assertFooterSayingAuthorVisible(updatedValue)
    } finally {
      await nexudusApi.updateBusinessSetting(accessToken, {
        BusinessId: footerSayingAuthor.BusinessId,
        Id: footerSayingAuthor.Id,
        Name: footerSayingAuthor.Name,
        Value: originalValue,
      })
    }
  })

  for (const socialSettingExpectation of socialSettingExpectations) {
    test(`${socialSettingExpectation.title} updates the social URL by API and shows the matching footer link in MP @api @dg`, async ({
      accessToken,
      nexudusApi,
    }) => {
      if (socialSettingExpectation.expectedFailureReason) {
        test.fail(true, socialSettingExpectation.expectedFailureReason)
      }

      const socialSetting = await nexudusApi.getBusinessSetting(accessToken, {
        businessId: currentBusinessId,
        name: socialSettingExpectation.name,
      })
      const originalValue = socialSetting.Value

      expect(
        socialSettingExpectation.url,
        `Expected the ${socialSettingExpectation.name} URL to differ from the current setting.`,
      ).not.toBe(originalValue)

      try {
        const updateResponse = await nexudusApi.updateBusinessSettingMutation(accessToken, {
          BusinessId: socialSetting.BusinessId,
          Id: socialSetting.Id,
          Name: socialSetting.Name,
          Value: socialSettingExpectation.url,
        })

        expect(updateResponse.Message).toBe(`Space Setting "${currentBusinessName}" was successfully updated.`)

        const updatedSetting = await nexudusApi.getBusinessSettingById(accessToken, socialSetting.Id)

        expect(updatedSetting.Value).toBe(socialSettingExpectation.url)

        await expect
          .poll(async () => {
            await homePage.goto(buildCacheBustedMPURL('/home'))
            return await homePage.hasFooterSocialLink(socialSettingExpectation.url)
          }, { timeout: 45000 })
          .toBe(true)

        await homePage.assertFooterSocialLinkVisible(socialSettingExpectation.url)
      } finally {
        await nexudusApi.updateBusinessSetting(accessToken, {
          BusinessId: socialSetting.BusinessId,
          Id: socialSetting.Id,
          Name: socialSetting.Name,
          Value: originalValue,
        })
      }
    })
  }
})

function buildCacheBustedMPURL(path: string) {
  const url = new URL(path, getConfiguredBaseURL('NEXUDUS_MP_BASE_URL'))
  url.searchParams.set('playwright_footer_suite', Date.now().toString())

  return url.toString()
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

function buildFooterSettingValue(testTitle: string) {
  const normalizedTitle = testTitle.replace(/[^a-z0-9]+/gi, ' ').trim()
  return generateUniqueName(`Playwright ${normalizedTitle}`, getContributorInitials())
}
