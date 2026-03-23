import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import * as dotenv from 'dotenv'
import { request as playwrightRequest } from 'playwright'

const defaultEnvFileNames = ['.env.shared', '.env']
const backofficeApiOrigin = 'https://spacesstaging.nexudus.com'
const backofficeAcceptHeader = 'application/json, text/plain, */*'
const trackedSeededResourcesFilePath = path.resolve(process.cwd(), 'playwright/.cache/resource-seed-added-resources.json')
const resourceSeedStateFilePath = path.resolve(process.cwd(), 'playwright/.cache/resource-seed-state.json')

for (const envFileName of defaultEnvFileNames) {
  const envFilePath = path.resolve(process.cwd(), envFileName)

  if (existsSync(envFilePath)) {
    dotenv.config({ path: envFilePath, override: false, quiet: true })
  }
}

const trackedResources = await readTrackedSeededResources()

if (trackedResources.length === 0) {
  console.log(`No tracked seeded resources found in ${trackedSeededResourcesFilePath}.`)
  process.exit(0)
}

let requestContext = null

try {
  const accessToken = await createBackofficeAccessTokenWithApiCredentials()
  requestContext = await playwrightRequest.newContext({
    baseURL: backofficeApiOrigin,
    extraHTTPHeaders: {
      accept: backofficeAcceptHeader,
      authorization: `Bearer ${accessToken}`,
    },
  })

  const deletedResources = []
  const missingResources = []
  const failedResources = []

  for (const resource of trackedResources) {
    const response = await requestContext.delete(`/api/spaces/resources/${resource.resourceId}`)
    const body = await parseJsonOrText(response)

    if (response.status() === 404) {
      missingResources.push(resource)
      continue
    }

    if (response.ok() && (typeof body !== 'object' || body?.WasSuccessful !== false)) {
      deletedResources.push(resource)
      continue
    }

    failedResources.push({
      ...resource,
      errorMessage: typeof body === 'object' ? body?.Message || null : body,
      status: response.status(),
    })
  }

  const deletedOrMissingIds = new Set([...deletedResources, ...missingResources].map((resource) => resource.resourceId))
  const remainingResources = trackedResources.filter((resource) => !deletedOrMissingIds.has(resource.resourceId))

  await writeTrackedSeededResources(remainingResources)
  await pruneResourceSeedStateByIds(Array.from(deletedOrMissingIds))

  console.log(
    JSON.stringify(
      {
        deletedResourceIds: deletedResources.map((resource) => resource.resourceId),
        failedResources,
        missingResourceIds: missingResources.map((resource) => resource.resourceId),
        remainingTrackedResourceIds: remainingResources.map((resource) => resource.resourceId),
        resourceSeedStateFilePath,
        trackedResourceFilePath: trackedSeededResourcesFilePath,
      },
      null,
      2,
    ),
  )

  if (failedResources.length > 0) {
    process.exitCode = 1
  }
} finally {
  await requestContext?.dispose()
}

async function createBackofficeAccessTokenWithApiCredentials() {
  const credentials = resolveBackofficeApiCredentials()
  const authRequestContext = await playwrightRequest.newContext({
    baseURL: backofficeApiOrigin,
  })

  try {
    const response = await authRequestContext.post('/api/token', {
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
      },
      form: {
        grant_type: 'password',
        password: credentials.password,
        username: credentials.username,
      },
    })

    if (!response.ok()) {
      throw new Error(`Expected Nexudus API token creation to succeed, but it returned HTTP ${response.status()}.`)
    }

    const token = await response.json()

    if (!token?.access_token || String(token.token_type || '').toLowerCase() !== 'bearer') {
      throw new Error('Expected Nexudus API token creation to return a bearer access token.')
    }

    return token.access_token
  } finally {
    await authRequestContext.dispose()
  }
}

async function parseJsonOrText(response) {
  try {
    return await response.json()
  } catch {
    return await response.text()
  }
}

async function readTrackedSeededResources() {
  try {
    const rawState = await readFile(trackedSeededResourcesFilePath, 'utf8')
    const parsedState = JSON.parse(rawState)

    return Array.isArray(parsedState.resources) ? deduplicateTrackedResources(parsedState.resources) : []
  } catch (error) {
    if (isMissingFileError(error)) {
      return []
    }

    throw error
  }
}

async function writeTrackedSeededResources(resources) {
  await mkdir(path.dirname(trackedSeededResourcesFilePath), { recursive: true })
  await writeFile(
    trackedSeededResourcesFilePath,
    JSON.stringify(
      {
        resources: deduplicateTrackedResources(resources),
      },
      null,
      2,
    ),
    'utf8',
  )
}

async function pruneResourceSeedStateByIds(resourceIds) {
  if (resourceIds.length === 0) {
    return
  }

  const trackedIds = new Set(resourceIds)

  try {
    const rawState = await readFile(resourceSeedStateFilePath, 'utf8')
    const parsedState = JSON.parse(rawState)
    const nextRecords = Array.isArray(parsedState.records)
      ? parsedState.records
          .map((record) => ({
            ...record,
            resourceIds: Array.isArray(record.resourceIds)
              ? record.resourceIds.filter((resourceId) => !trackedIds.has(resourceId))
              : [],
          }))
          .filter((record) => record.resourceIds.length > 0)
      : []

    await mkdir(path.dirname(resourceSeedStateFilePath), { recursive: true })
    await writeFile(
      resourceSeedStateFilePath,
      JSON.stringify(
        {
          records: nextRecords,
        },
        null,
        2,
      ),
      'utf8',
    )
  } catch (error) {
    if (!isMissingFileError(error)) {
      throw error
    }
  }
}

function deduplicateTrackedResources(resources) {
  return Array.from(new Map(resources.map((resource) => [resource.resourceId, resource])).values()).sort(
    (leftResource, rightResource) => leftResource.resourceId - rightResource.resourceId,
  )
}

function resolveBackofficeApiCredentials() {
  const apiUsername = process.env.NEXUDUS_API_USERNAME?.trim()
  const apiPassword = process.env.NEXUDUS_API_PASSWORD?.trim()

  if (apiUsername || apiPassword) {
    if (!apiUsername || !apiPassword) {
      throw new Error('Set both NEXUDUS_API_USERNAME and NEXUDUS_API_PASSWORD, or leave both unset.')
    }

    return {
      password: apiPassword,
      username: apiUsername,
    }
  }

  const username = process.env.NEXUDUS_ADMIN_EMAIL?.trim() || process.env.NEXUDUS_AP_EMAIL?.trim()
  const password = process.env.NEXUDUS_ADMIN_PASSWORD?.trim() || process.env.NEXUDUS_AP_PASSWORD?.trim()

  if (!username || !password) {
    throw new Error(
      'Missing direct API credentials. Set NEXUDUS_API_USERNAME and NEXUDUS_API_PASSWORD, or configure NEXUDUS_ADMIN_* or NEXUDUS_AP_* credentials.',
    )
  }

  return {
    password,
    username,
  }
}

function isMissingFileError(error) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
