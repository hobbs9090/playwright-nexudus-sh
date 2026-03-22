import { APIRequestContext } from '@playwright/test'
import { NexudusApiClient } from '../../../api/NexudusApiClient'
import { getConfiguredUserCredentials } from '../../../test-environments'

export type ResolvedMemberCredentials = {
  email: string
  password: string
  requestedName: string
  resolvedName: string
  resolutionSource: 'api_lookup' | 'configured_default' | 'member_env'
}

export async function resolveMemberCredentialsByName(
  request: APIRequestContext,
  requestedMemberName: string,
): Promise<ResolvedMemberCredentials> {
  const normalizedRequestedMemberName = normalizeName(requestedMemberName)

  if (!normalizedRequestedMemberName) {
    throw new Error('Member Name cannot be blank when resolving MP booking credentials.')
  }

  const configuredMemberCredentials = getConfiguredUserCredentials('member')
  const defaultPassword = getDefaultMemberPassword(configuredMemberCredentials.password)
  const envMemberKey = toMemberEnvKey(normalizedRequestedMemberName)
  const envMemberEmail = process.env[`NEXUDUS_MEMBER_${envMemberKey}_EMAIL`]?.trim() || ''
  const envMemberPassword = process.env[`NEXUDUS_MEMBER_${envMemberKey}_PASSWORD`]?.trim() || ''
  const memberPassword = envMemberPassword || defaultPassword
  const nexudusApi = new NexudusApiClient(request)
  const configuredMemberToken = await nexudusApi.createBearerTokenForCredentials(
    configuredMemberCredentials.email,
    configuredMemberCredentials.password,
  )
  const configuredMemberUser = await nexudusApi.getCurrentUser(configuredMemberToken.access_token)
  const configuredMemberFullName = normalizeName(String(configuredMemberUser.FullName || ''))

  if (configuredMemberFullName && configuredMemberFullName === normalizedRequestedMemberName) {
    return {
      email: configuredMemberCredentials.email,
      password: memberPassword,
      requestedName: requestedMemberName,
      resolvedName: String(configuredMemberUser.FullName || '').trim() || requestedMemberName,
      resolutionSource: envMemberEmail ? 'member_env' : 'configured_default',
    }
  }

  if (envMemberEmail) {
    return {
      email: envMemberEmail,
      password: memberPassword,
      requestedName: requestedMemberName,
      resolvedName: requestedMemberName,
      resolutionSource: 'member_env',
    }
  }

  const coworkers = await nexudusApi.listCoworkers(configuredMemberToken.access_token)
  const matchingCoworker = coworkers.find((coworker) => normalizeName(coworker.FullName || '') === normalizedRequestedMemberName)

  if (!matchingCoworker?.Email?.trim()) {
    throw new Error(
      `Could not resolve member "${requestedMemberName}". Add NEXUDUS_MEMBER_${envMemberKey}_EMAIL or make sure the member is visible through the Nexudus coworkers API.`,
    )
  }

  return {
    email: matchingCoworker.Email.trim(),
    password: memberPassword,
    requestedName: requestedMemberName,
    resolvedName: String(matchingCoworker.FullName || requestedMemberName).trim(),
    resolutionSource: 'api_lookup',
  }
}

function getDefaultMemberPassword(configuredMemberPassword: string) {
  return process.env.NEXUDUS_MEMBER_DEFAULT_PASSWORD?.trim() || configuredMemberPassword
}

function normalizeName(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function toMemberEnvKey(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}
