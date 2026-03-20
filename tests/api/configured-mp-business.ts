import { expect } from '@playwright/test'
import type { NexudusApiClient, NexudusCurrentUserResponse } from '../../api/NexudusApiClient'
import { getConfiguredLocationSelectorLabel } from '../../test-environments'

export type ConfiguredMpBusinessContext = {
  businessId: number
  businessName: string
}

export async function getConfiguredMpBusinessContext(
  nexudusApi: NexudusApiClient,
  accessToken: string,
  currentUser: NexudusCurrentUserResponse,
): Promise<ConfiguredMpBusinessContext> {
  const configuredBusinessName = getConfiguredLocationSelectorLabel('mp')
  const defaultBusinessId = getCurrentBusinessId(currentUser)
  const defaultBusinessName = currentUser.DefaultBusinessName?.toString().trim()

  if (defaultBusinessName === configuredBusinessName) {
    return {
      businessId: defaultBusinessId,
      businessName: configuredBusinessName,
    }
  }

  const accessibleBusinessIds = (currentUser.Businesses || [])
    .map((businessId) => Number(businessId))
    .filter((businessId) => Number.isInteger(businessId) && businessId > 0)

  expect(
    accessibleBusinessIds.length,
    `Expected the current API user to expose at least one accessible business id when resolving "${configuredBusinessName}".`,
  ).toBeGreaterThan(0)

  const accessibleBusinesses = await Promise.all(
    accessibleBusinessIds.map((businessId) => nexudusApi.getBusiness(accessToken, businessId)),
  )

  const configuredBusiness = accessibleBusinesses.find(
    (business) => business.Name?.toString().trim() === configuredBusinessName,
  )

  expect(
    configuredBusiness?.Id,
    `Expected the current API user to have access to the configured MP business "${configuredBusinessName}".`,
  ).toBeTruthy()

  return {
    businessId: configuredBusiness!.Id,
    businessName: configuredBusinessName,
  }
}

function getCurrentBusinessId(currentUser: NexudusCurrentUserResponse) {
  const currentBusinessId = Number(currentUser.DefaultBusinessId)

  expect(
    Number.isInteger(currentBusinessId) && currentBusinessId > 0,
    'Expected the current API user profile to expose a numeric default business id.',
  ).toBeTruthy()

  return currentBusinessId
}
