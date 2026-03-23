import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import * as dotenv from 'dotenv'
import { request as playwrightRequest } from 'playwright'

const defaultEnvFileNames = ['.env.shared', '.env']
const backofficeApiOrigin = 'https://spacesstaging.nexudus.com'
const bookingUtilityStateFilePath = path.resolve(process.cwd(), 'playwright/.cache/booking-utility-state.json')
const legacyBookingUtilityStateFilePath = path.resolve(process.cwd(), 'playwright/.cache/mp-booking-utility-state.json')

for (const envFileName of defaultEnvFileNames) {
  const envFilePath = path.resolve(process.cwd(), envFileName)

  if (existsSync(envFilePath)) {
    dotenv.config({ path: envFilePath, override: false, quiet: true })
  }
}

const storedState = await readBookingUtilityState()
const trackedBookingIds = Array.from(
  new Set(storedState.records.flatMap((record) => (Array.isArray(record.bookingIds) ? record.bookingIds : [])).filter(Number.isInteger)),
).sort((leftId, rightId) => leftId - rightId)

if (trackedBookingIds.length === 0) {
  console.log(`No tracked booking utility records found in ${bookingUtilityStateFilePath}.`)
  process.exit(0)
}

const accessToken = await createBackofficeAccessTokenWithApiCredentials()
const requestContext = await playwrightRequest.newContext({
  baseURL: backofficeApiOrigin,
  extraHTTPHeaders: {
    accept: 'application/json, text/plain, */*',
    authorization: `Bearer ${accessToken}`,
  },
})

try {
  const deletedBookingIds = []
  const missingBookingIds = []
  const failedBookings = []

  for (const bookingId of trackedBookingIds) {
    const existingBookingResponse = await requestContext.get(`/api/spaces/bookings/${bookingId}`)

    if (existingBookingResponse.status() === 404) {
      missingBookingIds.push(bookingId)
      continue
    }

    if (!existingBookingResponse.ok()) {
      failedBookings.push({
        bookingId,
        errorMessage: await parseJsonOrText(existingBookingResponse),
        status: existingBookingResponse.status(),
      })
      continue
    }

    const cancelResponse = await requestContext.post('/api/spaces/bookings/runCommand', {
      data: {
        Ids: [bookingId],
        Key: 'CANCEL_BOOKING',
        Parameters: [
          {
            Name: 'Cancellation Reason',
            Type: 'eBookingCancellationReason',
            Value: 1,
          },
          {
            Name: 'Cancel without applying cancellation fee rules.',
            Type: 'Boolean',
            Value: 'True',
          },
        ],
      },
      headers: {
        'content-type': 'application/json',
      },
    })
    const cancelBody = await parseJsonOrText(cancelResponse)

    if (!cancelResponse.ok() || cancelBody?.WasSuccessful === false) {
      failedBookings.push({
        bookingId,
        errorMessage: typeof cancelBody === 'object' ? cancelBody?.Message || null : cancelBody,
        status: cancelResponse.status(),
      })
      continue
    }

    const deletedAfterCancel = await waitForBookingDeletion(requestContext, bookingId)

    if (deletedAfterCancel) {
      deletedBookingIds.push(bookingId)
      continue
    }

    failedBookings.push({
      bookingId,
      errorMessage: 'Booking still existed after the cancel command completed.',
      status: cancelResponse.status(),
    })
  }

  const prunableBookingIds = new Set([...deletedBookingIds, ...missingBookingIds])
  const nextRecords = storedState.records
    .map((record) => ({
      ...record,
      bookingIds: (Array.isArray(record.bookingIds) ? record.bookingIds : []).filter((bookingId) => !prunableBookingIds.has(bookingId)),
    }))
    .filter((record) => record.bookingIds.length > 0)

  await writeBookingUtilityStateFile(bookingUtilityStateFilePath, { records: nextRecords })
  await writeBookingUtilityStateFile(legacyBookingUtilityStateFilePath, { records: [] })

  console.log(
    JSON.stringify(
      {
        bookingUtilityStateFilePath,
        deletedBookingIds,
        failedBookings,
        legacyBookingUtilityStateFilePath,
        missingBookingIds,
        remainingTrackedBookingIds: nextRecords.flatMap((record) => record.bookingIds),
      },
      null,
      2,
    ),
  )

  if (failedBookings.length > 0) {
    process.exitCode = 1
  }
} finally {
  await requestContext.dispose()
}

async function waitForBookingDeletion(requestContext, bookingId) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const bookingResponse = await requestContext.get(`/api/spaces/bookings/${bookingId}`)

    if (bookingResponse.status() === 404) {
      return true
    }

    if (!bookingResponse.ok()) {
      return false
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  return false
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

async function readBookingUtilityState() {
  const [currentState, legacyState] = await Promise.all([
    readBookingUtilityStateFile(bookingUtilityStateFilePath),
    bookingUtilityStateFilePath === legacyBookingUtilityStateFilePath
      ? Promise.resolve({ records: [] })
      : readBookingUtilityStateFile(legacyBookingUtilityStateFilePath),
  ])

  return {
    records: deduplicateBookingUtilityRecords([...legacyState.records, ...currentState.records]),
  }
}

async function readBookingUtilityStateFile(filePath) {
  try {
    const rawState = await readFile(filePath, 'utf8')
    const parsedState = JSON.parse(rawState)

    return {
      records: Array.isArray(parsedState.records) ? parsedState.records : [],
    }
  } catch (error) {
    if (isMissingFileError(error)) {
      return { records: [] }
    }

    throw error
  }
}

async function writeBookingUtilityStateFile(filePath, state) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(
    filePath,
    JSON.stringify(
      {
        records: deduplicateBookingUtilityRecords(Array.isArray(state.records) ? state.records : []),
      },
      null,
      2,
    ),
    'utf8',
  )
}

function deduplicateBookingUtilityRecords(records) {
  return Array.from(
    new Map(
      records.map((record) => [
        `${record.scenarioKey}|${record.bookingMode || 'mp'}`,
        {
          ...record,
          bookingIds: Array.from(new Set(Array.isArray(record.bookingIds) ? record.bookingIds : [])).sort((leftId, rightId) => leftId - rightId),
        },
      ]),
    ).values(),
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
