import { test } from '@playwright/test'
import { MPLoginPage } from '../../page-objects/mp/MPLoginPage'
import { MPPortalPage } from '../../page-objects/mp/MPPortalPage'
import {
  announceGremlinsRun,
  assertGremlinsRunHealthy,
  attachGremlinsArtifacts,
  buildGremlinsRunOptions,
  installGremlins,
  runGremlinsAttack,
} from './support/gremlins'

const hasMemberCredentials =
  (Boolean(process.env.NEXUDUS_MEMBER_EMAIL?.trim()) && Boolean(process.env.NEXUDUS_MEMBER_PASSWORD?.trim())) ||
  (Boolean(process.env.NEXUDUS_MP_EMAIL?.trim()) && Boolean(process.env.NEXUDUS_MP_PASSWORD?.trim()))

test.describe('MP authenticated gremlins', () => {
  test('member portal language settings stay usable after a conservative gremlins attack @gremlins @mp', async ({ page }, testInfo) => {
    test.slow()
    test.skip(!hasMemberCredentials, 'MP gremlins authenticated coverage requires MP member credentials.')

    const loginPage = new MPLoginPage(page)
    const portalPage = new MPPortalPage(page)

    await installGremlins(page)
    await loginPage.login()
    await loginPage.assertDashboardVisible()
    await portalPage.dismissOnboardingModalIfPresent()

    const currentUserFullName = await loginPage.getDashboardGreetingName()
    await page.goto('/settings/language')
    await portalPage.dismissOnboardingModalIfPresent()
    await portalPage.assertMainHeadingVisible('Language')

    const gremlinsOptions = buildGremlinsRunOptions('mp-portal-language', {
      actionCount: 40,
      blockedTextSubstrings: ['log out', 'logout', 'delete', 'remove', 'save', 'submit'],
      ignoredPageErrorSubstrings: ['The current environment does not support this operation.', 'OneSignalPageSDKES6.js'],
      interactionSelector: 'main',
      species: ['clicker', 'scroller'],
    })

    announceGremlinsRun(gremlinsOptions, testInfo)

    const gremlinsSummary = await runGremlinsAttack(page, gremlinsOptions)

    await attachGremlinsArtifacts(testInfo, gremlinsOptions, gremlinsSummary)
    assertGremlinsRunHealthy(gremlinsSummary)

    await page.goto('/settings/language')
    await portalPage.dismissOnboardingModalIfPresent()
    await portalPage.assertMainHeadingVisible('Language')
    await loginPage.assertProfileMenuContains(currentUserFullName)
  })
})
