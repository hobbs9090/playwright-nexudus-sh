import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type MPBookingUtilityAction = 'add' | 'delete'

const bookingUtilityEnvVarName = 'NEXUDUS_BDD_BOOKING_ACTION'
const bookingUtilityStateFilePath = path.resolve(process.cwd(), 'playwright/.cache/mp-booking-utility-state.json')

export type StoredBookingUtilityRecord = {
  bookingIds: number[]
  createdAtISO: string
  memberName: string
  request: {
    alternativePreference: string
    bookingDate: string
    bookingLength: string
    repeatOptions: string
    resourceName: string
    startTime: string
  }
  scenarioKey: string
}

type StoredBookingUtilityState = {
  records: StoredBookingUtilityRecord[]
}

export function resolveBookingUtilityAction(): MPBookingUtilityAction {
  const rawBookingUtilityAction = process.env[bookingUtilityEnvVarName]?.trim().toLowerCase()

  if (!rawBookingUtilityAction) {
    return 'add'
  }

  if (rawBookingUtilityAction === 'add' || rawBookingUtilityAction === 'delete') {
    return rawBookingUtilityAction
  }

  throw new Error(
    `Unsupported ${bookingUtilityEnvVarName} value "${process.env[bookingUtilityEnvVarName]}". Use "add" or "delete".`,
  )
}

export function getBookingUtilityEnvVarName() {
  return bookingUtilityEnvVarName
}

export function getBookingUtilityStateFilePath() {
  return bookingUtilityStateFilePath
}

export function createBookingUtilityScenarioKey({
  alternativePreference,
  bookingDate,
  bookingLength,
  memberName,
  repeatOptions,
  resourceName,
  startTime,
}: {
  alternativePreference: string
  bookingDate: string
  bookingLength: string
  memberName: string
  repeatOptions: string
  resourceName: string
  startTime: string
}) {
  return [
    normalizeScenarioField(memberName),
    normalizeScenarioField(resourceName),
    normalizeScenarioField(bookingDate),
    normalizeScenarioField(startTime),
    normalizeScenarioField(bookingLength),
    normalizeScenarioField(repeatOptions),
    normalizeScenarioField(alternativePreference),
  ].join('|')
}

export async function readBookingUtilityRecord(scenarioKey: string) {
  const state = await readBookingUtilityState()
  return state.records.find((record) => record.scenarioKey === scenarioKey) || null
}

export async function writeBookingUtilityRecord(record: StoredBookingUtilityRecord) {
  const state = await readBookingUtilityState()
  const nextRecords = state.records.filter((existingRecord) => existingRecord.scenarioKey !== record.scenarioKey)

  nextRecords.push(record)
  await writeBookingUtilityState({ records: nextRecords })
}

export async function deleteBookingUtilityRecord(scenarioKey: string) {
  const state = await readBookingUtilityState()
  const nextRecords = state.records.filter((record) => record.scenarioKey !== scenarioKey)
  await writeBookingUtilityState({ records: nextRecords })
}

async function readBookingUtilityState(): Promise<StoredBookingUtilityState> {
  try {
    const rawState = await readFile(bookingUtilityStateFilePath, 'utf8')
    const parsedState = JSON.parse(rawState) as StoredBookingUtilityState

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

async function writeBookingUtilityState(state: StoredBookingUtilityState) {
  await mkdir(path.dirname(bookingUtilityStateFilePath), { recursive: true })
  await writeFile(
    bookingUtilityStateFilePath,
    JSON.stringify(
      {
        records: state.records,
      },
      null,
      2,
    ),
    'utf8',
  )
}

function normalizeScenarioField(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
