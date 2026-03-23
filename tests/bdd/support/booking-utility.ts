import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type MPBookingUtilityAction = 'add' | 'delete'
export type BookingUtilityMode = 'ap' | 'api' | 'mp'

const bookingUtilityEnvVarName = 'NEXUDUS_BDD_BOOKING_ACTION'
const bookingUtilityModeEnvVarName = 'NEXUDUS_BDD_BOOKING_MODE'
const bookingUtilityStateFilePath = path.resolve(process.cwd(), 'playwright/.cache/booking-utility-state.json')
const legacyBookingUtilityStateFilePath = path.resolve(process.cwd(), 'playwright/.cache/mp-booking-utility-state.json')

export type StoredBookingUtilityRecord = {
  bookingIds: number[]
  bookingMode?: BookingUtilityMode
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

export function resolveBookingUtilityMode(): BookingUtilityMode {
  const rawBookingUtilityMode = process.env[bookingUtilityModeEnvVarName]?.trim().toLowerCase()

  if (!rawBookingUtilityMode) {
    return 'mp'
  }

  return parseBookingUtilityMode(rawBookingUtilityMode, bookingUtilityModeEnvVarName)
}

export function getBookingUtilityEnvVarName() {
  return bookingUtilityEnvVarName
}

export function getBookingUtilityModeEnvVarName() {
  return bookingUtilityModeEnvVarName
}

export function parseBookingUtilityMode(rawBookingUtilityMode: string, sourceLabel = 'booking utility mode'): BookingUtilityMode {
  const normalizedBookingUtilityMode = rawBookingUtilityMode.trim().toLowerCase()

  if (normalizedBookingUtilityMode === 'ap' || normalizedBookingUtilityMode === 'api' || normalizedBookingUtilityMode === 'mp') {
    return normalizedBookingUtilityMode
  }

  throw new Error(`Unsupported ${sourceLabel} value "${rawBookingUtilityMode}". Use "mp", "ap", or "api".`)
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

export async function readBookingUtilityRecord(scenarioKey: string, bookingMode: BookingUtilityMode = 'mp') {
  const state = await readBookingUtilityState()
  return state.records.find((record) => record.scenarioKey === scenarioKey && (record.bookingMode || 'mp') === bookingMode) || null
}

export async function writeBookingUtilityRecord(record: StoredBookingUtilityRecord) {
  const state = await readBookingUtilityState()
  const normalizedBookingMode = record.bookingMode || 'mp'
  const nextRecords = state.records.filter(
    (existingRecord) =>
      existingRecord.scenarioKey !== record.scenarioKey || (existingRecord.bookingMode || 'mp') !== normalizedBookingMode,
  )

  nextRecords.push(record)
  await writeBookingUtilityState({ records: nextRecords })
}

export async function deleteBookingUtilityRecord(scenarioKey: string, bookingMode: BookingUtilityMode = 'mp') {
  const state = await readBookingUtilityState()
  const nextRecords = state.records.filter(
    (record) => record.scenarioKey !== scenarioKey || (record.bookingMode || 'mp') !== bookingMode,
  )
  await writeBookingUtilityState({ records: nextRecords })
}

async function readBookingUtilityState(): Promise<StoredBookingUtilityState> {
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

function deduplicateBookingUtilityRecords(records: StoredBookingUtilityRecord[]) {
  return Array.from(
    new Map(
      records.map((record) => [
        `${record.scenarioKey}|${record.bookingMode || 'mp'}`,
        record,
      ]),
    ).values(),
  )
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

async function readBookingUtilityStateFile(filePath: string): Promise<StoredBookingUtilityState> {
  try {
    const rawState = await readFile(filePath, 'utf8')
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
