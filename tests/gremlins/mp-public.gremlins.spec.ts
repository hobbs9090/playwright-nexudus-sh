import { expect, test } from '@playwright/test'
import { MPFaqPage } from '../../page-objects/mp/MPFaqPage'
import { MPHomePage } from '../../page-objects/mp/MPHomePage'
import {
  announceGremlinsRun,
  assertGremlinsRunHealthy,
  attachGremlinsArtifacts,
  buildGremlinsRunOptions,
  installGremlins,
  runGremlinsAttack,
} from './support/gremlins'

test.describe('MP public gremlins', () => {
  test('public home stays reachable after a conservative gremlins attack @gremlins @mp', async ({ page }, testInfo) => {
    test.slow()

    const homePage = new MPHomePage(page)

    await installGremlins(page)
    await homePage.goto('/home')

    const contentData = await homePage.getConfiguredContentData()

    await expect(page).toHaveURL(/\/home(?:\?.*)?$/)
    await homePage.assertPublicMarketingEntryPointsVisible(contentData.businessName)
    await homePage.assertFooterBrandingVisible(contentData.businessName)

    const gremlinsOptions = buildGremlinsRunOptions('mp-public-home')

    announceGremlinsRun(gremlinsOptions, testInfo)

    const gremlinsSummary = await runGremlinsAttack(page, gremlinsOptions)

    await attachGremlinsArtifacts(testInfo, gremlinsOptions, gremlinsSummary)
    assertGremlinsRunHealthy(gremlinsSummary)

    await homePage.goto('/home')
    await expect(page).toHaveURL(/\/home(?:\?.*)?$/)
    await homePage.assertPublicMarketingEntryPointsVisible(contentData.businessName)
    await homePage.assertFooterBrandingVisible(contentData.businessName)
  })

  test('public FAQ stays reachable after a conservative gremlins attack @gremlins @mp', async ({ page }, testInfo) => {
    test.slow()

    const faqPage = new MPFaqPage(page)
    const homePage = new MPHomePage(page)

    await installGremlins(page)
    await page.goto('/faq')
    await faqPage.assertLandingPageVisible()

    const gremlinsOptions = buildGremlinsRunOptions('mp-public-faq', {
      species: ['clicker', 'toucher', 'scroller'],
    })

    announceGremlinsRun(gremlinsOptions, testInfo)

    const gremlinsSummary = await runGremlinsAttack(page, gremlinsOptions)

    await attachGremlinsArtifacts(testInfo, gremlinsOptions, gremlinsSummary)
    assertGremlinsRunHealthy(gremlinsSummary)

    await homePage.goto('/faq')
    await expect(page).toHaveURL(/\/faq(?:\/.*)?(?:\?.*)?$/)
    await faqPage.assertLandingPageVisible()
  })
})
