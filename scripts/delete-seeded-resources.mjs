import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import * as dotenv from 'dotenv'
import { chromium, request as playwrightRequest } from 'playwright'

const defaultEnvFileNames = ['.env.shared', '.env']
const defaultApBaseUrl = 'https://dashboard-staging.nexudus.com/'
const defaultApLocationLabel = 'Coworking Soho (STEVEN)'
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

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
let requestContext = null

try {
  const accessToken = await loginAndCaptureBackofficeAccessToken(page)
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
  await browser.close()
}

async function loginAndCaptureBackofficeAccessToken(page) {
  const apBaseUrl = process.env.NEXUDUS_AP_BASE_URL?.trim() || defaultApBaseUrl
  const apEmail = process.env.NEXUDUS_AP_EMAIL?.trim()
  const apPassword = process.env.NEXUDUS_AP_PASSWORD?.trim()

  if (!apEmail || !apPassword) {
    throw new Error('Missing NEXUDUS_AP_EMAIL or NEXUDUS_AP_PASSWORD.')
  }

  page.on('dialog', async (dialog) => {
    await dialog.dismiss().catch(() => {})
  })

  await page.goto(apBaseUrl)
  await page.getByLabel('Email').fill(apEmail)
  await page.getByLabel('Password').fill(apPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await Promise.race([
    page.getByRole('link', { name: 'Dashboard' }).first().waitFor({ timeout: 30000 }),
    page.getByRole('textbox', { name: /Search everywhere for/i }).waitFor({ timeout: 30000 }),
  ])

  await ensureConfiguredLocationSelected(page)

  const tokenCaptureUrl = new URL('/content/courses', apBaseUrl)
  tokenCaptureUrl.searchParams.set('playwright_backoffice_token', Date.now().toString())

  const apiRequestPromise = page.waitForRequest(
    (request) =>
      request.url().startsWith(`${backofficeApiOrigin}/api/`) && /^Bearer\s+\S+/i.test(request.headers().authorization || ''),
    { timeout: 30000 },
  )

  await page.goto(tokenCaptureUrl.toString())

  const apiRequest = await apiRequestPromise
  const authorizationHeader = apiRequest.headers().authorization || ''

  if (!/^Bearer\s+\S+/i.test(authorizationHeader)) {
    throw new Error('Expected authenticated AP navigation to issue a back-office API request with a bearer token.')
  }

  return authorizationHeader.replace(/^Bearer\s+/i, '')
}

async function ensureConfiguredLocationSelected(page) {
  const locationLabel = process.env.NEXUDUS_AP_LOCATION_SELECTOR_LABEL?.trim() || defaultApLocationLabel
  const locationMenu = page.locator('[aria-label="Locations menu"]').first()

  await locationMenu.waitFor({ state: 'visible', timeout: 30000 })

  if ((await locationMenu.innerText()).trim() === locationLabel) {
    return
  }

  await locationMenu.dispatchEvent('click')

  const targetLocationOption = page.getByRole('option').filter({ hasText: locationLabel }).first()

  await targetLocationOption.waitFor({ state: 'visible', timeout: 10000 })
  await targetLocationOption.dispatchEvent('click')
  await page.waitForFunction(
    ([selector, expectedLabel]) => {
      const element = document.querySelector(selector)
      return element != null && element.textContent != null && element.textContent.includes(expectedLabel)
    },
    ['[aria-label="Locations menu"]', locationLabel],
    { timeout: 30000 },
  )
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

function isMissingFileError(error) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
