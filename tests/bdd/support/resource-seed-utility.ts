import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildCrudName } from '../../../helpers'

export type ResourceSeedUtilityRequest = {
  allocation: string
  allowMultipleBookings: string
  amenities: string
  base: string
  count: string
  hideInCalendar: string
  maxBookingLength: string
  minBookingLength: string
  onlyForMembers: string
  requiresConfirmation: string
  resourceType: string
  seed: string
  theme: string
  visible: string
}

export type StoredResourceSeedRecord = {
  businessId: number
  businessName: string
  createdAtISO: string
  generatedNames: string[]
  request: ResourceSeedUtilityRequest
  resourceIds: number[]
  resourceTypeId: number
  resourceTypeName: string
  scenarioKey: string
  seedStem: string | null
}

export type TrackedSeededResource = {
  businessId: number
  businessName: string
  createdAtISO: string
  name: string
  resourceId: number
  resourceTypeId: number
  resourceTypeName: string
  scenarioKey: string
}

type StoredResourceSeedState = {
  records: StoredResourceSeedRecord[]
}

type TrackedSeededResourceState = {
  resources: TrackedSeededResource[]
}

const proceduralThemeFlairTerms = [
  'croft',
  'field',
  'ford',
  'stone',
  'mere',
  'wick',
  'vale',
  'brook',
  'shaw',
  'holm',
  'wood',
  'ridge',
  'hurst',
  'bourne',
  'thorne',
  'well',
  'stead',
  'mont',
] as const
const themeStopWords = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with'])
const themeDescriptorWords = new Set([
  'author',
  'authors',
  'character',
  'characters',
  'first',
  'hero',
  'heroes',
  'last',
  'name',
  'names',
  'novelist',
  'novelists',
  'surname',
  'surnames',
  'villain',
  'villains',
])
const resourceSeedStateFilePath = path.resolve(process.cwd(), 'playwright/.cache/resource-seed-state.json')
const trackedSeededResourcesFilePath = path.resolve(process.cwd(), 'playwright/.cache/resource-seed-added-resources.json')

export function getResourceSeedStateFilePath() {
  return resourceSeedStateFilePath
}

export function getTrackedSeededResourcesFilePath() {
  return trackedSeededResourcesFilePath
}

export function createResourceSeedScenarioKey(request: ResourceSeedUtilityRequest) {
  return [
    normalizeScenarioField(request.resourceType),
    normalizeScenarioField(request.count),
    normalizeScenarioField(request.theme),
    normalizeScenarioField(request.base),
    normalizeScenarioField(request.seed),
    normalizeScenarioField(request.visible),
    normalizeScenarioField(request.requiresConfirmation),
    normalizeScenarioField(request.allocation),
    normalizeScenarioField(request.minBookingLength),
    normalizeScenarioField(request.maxBookingLength),
    normalizeScenarioField(request.allowMultipleBookings),
    normalizeScenarioField(request.hideInCalendar),
    normalizeScenarioField(request.onlyForMembers),
    normalizeScenarioField(canonicalizeAmenities(request.amenities)),
  ].join('|')
}

export async function readResourceSeedRecord(scenarioKey: string) {
  const state = await readResourceSeedState()
  return state.records.find((record) => record.scenarioKey === scenarioKey) || null
}

export async function writeResourceSeedRecord(record: StoredResourceSeedRecord) {
  const state = await readResourceSeedState()
  const nextRecords = state.records.filter((existingRecord) => existingRecord.scenarioKey !== record.scenarioKey)

  nextRecords.push(record)
  await writeResourceSeedState({ records: nextRecords })
}

export async function deleteResourceSeedRecord(scenarioKey: string) {
  const state = await readResourceSeedState()
  const nextRecords = state.records.filter((record) => record.scenarioKey !== scenarioKey)
  await writeResourceSeedState({ records: nextRecords })
}

export async function readTrackedSeededResources() {
  const state = await readTrackedSeededResourceState()
  return state.resources
}

export async function trackSeededResources(resources: TrackedSeededResource[]) {
  if (resources.length === 0) {
    return
  }

  const state = await readTrackedSeededResourceState()
  const nextResources = deduplicateTrackedSeededResources([...state.resources, ...resources])
  await writeTrackedSeededResourceState({ resources: nextResources })
}

export async function untrackSeededResourcesByIds(resourceIds: number[]) {
  if (resourceIds.length === 0) {
    return
  }

  const trackedIds = new Set(resourceIds)
  const state = await readTrackedSeededResourceState()
  const nextResources = state.resources.filter((resource) => !trackedIds.has(resource.resourceId))
  await writeTrackedSeededResourceState({ resources: nextResources })
}

export async function buildResourceSeedNames({
  base,
  count,
  resourceTypeName,
  seed,
  theme,
}: {
  base: string
  count: number
  resourceTypeName: string
  seed: boolean
  theme: string
}) {
  const resolvedBase = base.trim()
  const sequenceWidth = Math.max(2, String(count).length)
  const seedSuffix = seed ? buildCrudSeedSuffix(resolvedBase || resourceTypeName.trim()) : null
  const themedNames = resolveOptionalThemedNames(theme, count)
  const fallbackNameBase = resolvedBase || resourceTypeName.trim()

  if (!seed && count > 1 && themedNames.names.length === 0) {
    throw new Error('Theme is required when Seed is false and Count is greater than 1, so generated names remain unique.')
  }

  const generatedNames = Array.from({ length: count }, (_, index) => {
    const nameParts = [themedNames.names[index] || '', resolvedBase]
    const visibleName = joinNameParts(nameParts) || fallbackNameBase
    const seededName = seedSuffix ? joinNameParts([visibleName, seedSuffix]) : visibleName

    if (seedSuffix) {
      return appendSequence(seededName, index + 1, sequenceWidth)
    }

    if (count > 1 && themedNames.names.length === 0) {
      return appendSequence(visibleName, index + 1, sequenceWidth)
    }

    return seededName
  })

  return {
    fallbackCount: themedNames.fallbackCount,
    names: generatedNames,
    seedStem: seedSuffix,
    themedNames: themedNames.names,
  }
}

function appendSequence(seedStem: string, sequence: number, sequenceWidth: number) {
  return `${seedStem} ${String(sequence).padStart(sequenceWidth, '0')}`.trim()
}

function canonicalizeAmenities(amenities: string) {
  return Array.from(
    new Set(
      amenities
        .split(',')
        .map((amenity) => amenity.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .map((amenity) => amenity.toLowerCase()),
    ),
  )
    .sort((leftAmenity, rightAmenity) => leftAmenity.localeCompare(rightAmenity))
    .join(',')
}

function joinNameParts(parts: string[]) {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
}

function normalizeScenarioField(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

async function readResourceSeedState(): Promise<StoredResourceSeedState> {
  return readResourceSeedStateFile(resourceSeedStateFilePath)
}

async function readTrackedSeededResourceState(): Promise<TrackedSeededResourceState> {
  return readTrackedSeededResourceStateFile(trackedSeededResourcesFilePath)
}

async function writeResourceSeedState(state: StoredResourceSeedState) {
  await mkdir(path.dirname(resourceSeedStateFilePath), { recursive: true })
  await writeFile(
    resourceSeedStateFilePath,
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

async function writeTrackedSeededResourceState(state: TrackedSeededResourceState) {
  await mkdir(path.dirname(trackedSeededResourcesFilePath), { recursive: true })
  await writeFile(
    trackedSeededResourcesFilePath,
    JSON.stringify(
      {
        resources: state.resources,
      },
      null,
      2,
    ),
    'utf8',
  )
}

function resolveOptionalThemedNames(theme: string, count: number) {
  const normalizedTheme = normalizeScenarioField(theme)

  if (!normalizedTheme) {
    return {
      fallbackCount: 0,
      names: [],
    }
  }

  return resolveThemedResourceNames(theme, count)
}

function resolveThemedResourceNames(themeQuery: string, count: number) {
  const recognizedNames = deduplicateNames(buildRecognizedThemeDisplayNames(themeQuery))
  const names = recognizedNames.slice(0, count)

  if (names.length < count) {
    names.push(...buildProceduralThemeNames(themeQuery, count - names.length, names))
  }

  return {
    fallbackCount: Math.max(0, count - Math.min(count, recognizedNames.length)),
    names,
  }
}

function deduplicateNames(names: string[]) {
  return Array.from(
    new Map(
      names
        .map((name) => name.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .map((name) => [normalizeScenarioField(name), name] as const),
    ).values(),
  )
}

function buildProceduralThemeNames(themeQuery: string, count: number, existingNames: string[]) {
  if (count <= 0) {
    return []
  }

  const usedNames = new Set(existingNames.map((name) => normalizeScenarioField(name)))
  const themeTerms = extractThemeTerms(themeQuery)
  const candidates = deduplicateNames([
    ...buildThemeSingleCandidates(themeTerms),
    ...buildThemeFlairCandidates(themeTerms),
  ])
  const generatedNames: string[] = []

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeScenarioField(candidate)

    if (usedNames.has(normalizedCandidate)) {
      continue
    }

    generatedNames.push(candidate)
    usedNames.add(normalizedCandidate)

    if (generatedNames.length === count) {
      return generatedNames
    }
  }

  let fallbackIndex = 1

  while (generatedNames.length < count) {
    const themeTerm = themeTerms[(fallbackIndex - 1) % themeTerms.length] || 'Theme'
    const flairTerm = proceduralThemeFlairTerms[(fallbackIndex - 1) % proceduralThemeFlairTerms.length]
    const candidate = buildSurnameLikeCandidate(themeTerm, flairTerm, fallbackIndex)
    const normalizedCandidate = normalizeScenarioField(candidate)

    if (!usedNames.has(normalizedCandidate)) {
      generatedNames.push(candidate)
      usedNames.add(normalizedCandidate)
    }

    fallbackIndex += 1
  }

  return generatedNames
}

function buildThemeSingleCandidates(themeTerms: string[]) {
  return [...themeTerms].reverse()
}

function buildThemeFlairCandidates(themeTerms: string[]) {
  const candidates: string[] = []

  for (const primaryTerm of themeTerms) {
    for (const flairTerm of proceduralThemeFlairTerms) {
      candidates.push(buildSurnameLikeCandidate(primaryTerm, flairTerm))
    }
  }

  return candidates
}

function buildSurnameLikeCandidate(themeTerm: string, flairTerm: string, fallbackIndex?: number) {
  const normalizedThemeTerm = themeTerm.trim()

  if (!normalizedThemeTerm) {
    return fallbackIndex ? `Theme${String(fallbackIndex).padStart(2, '0')}` : 'Theme'
  }

  const suffix = flairTerm.trim()
  const normalizedSuffix = normalizedThemeTerm.toLowerCase().endsWith(suffix.toLowerCase()) ? '' : titleCaseThemeWord(suffix)
  const baseCandidate = `${normalizedThemeTerm}${normalizedSuffix}`.trim()

  if (!fallbackIndex) {
    return baseCandidate
  }

  return `${baseCandidate}${String(fallbackIndex).padStart(2, '0')}`
}

function extractThemeTerms(themeQuery: string) {
  const cleanedThemeQuery = themeQuery.replace(/[^a-z0-9\s'-]+/gi, ' ')
  const themeWords = cleanedThemeQuery
    .split(/\s+/)
    .map((word) => normalizeThemeWord(word))
    .filter(Boolean)
  const contentWords = themeWords.filter(
    (word) => !themeStopWords.has(word.toLowerCase()) && !themeDescriptorWords.has(word.toLowerCase()),
  )
  const sourceWords = contentWords.length > 0 ? contentWords : themeWords

  return deduplicateNames(sourceWords.map((word) => titleCaseThemeWord(word))).slice(0, 4)
}

function buildRecognizedThemeDisplayNames(themeQuery: string) {
  const normalizedThemeQuery = normalizeScenarioField(themeQuery)

  if (normalizedThemeQuery.includes('harry potter') && normalizedThemeQuery.includes('villain')) {
    return reduceFullNamesToPreferredLabels([
      'Bellatrix Lestrange',
      'Lucius Malfoy',
      'Narcissa Malfoy',
      'Dolores Umbridge',
      'Tom Riddle',
      'Fenrir Greyback',
      'Barty Crouch Jr',
      'Peter Pettigrew',
      'Antonin Dolohov',
      'Thorfinn Rowle',
      'Alecto Carrow',
      'Amycus Carrow',
      'Pius Thicknesse',
      'Corban Yaxley',
      'Augustus Rookwood',
      'Igor Karkaroff',
      'Walden Macnair',
      'Travers',
      'Mulciber',
      'Nott',
      'Avery',
      'Crabbe',
      'Goyle',
      'Scabior',
      'Selwyn',
      'Rosier',
      'Jugson',
    ])
  }

  if (normalizedThemeQuery.includes('great american novelist')) {
    return reduceFullNamesToPreferredLabels([
      'Harper Lee',
      'Mark Twain',
      'F Scott Fitzgerald',
      'Ernest Hemingway',
      'Toni Morrison',
      'John Steinbeck',
      'Ralph Ellison',
      'Kurt Vonnegut',
      'Saul Bellow',
      'Willa Cather',
      'Don DeLillo',
      'Flannery OConnor',
      'Edith Wharton',
      'Zora Neale Hurston',
      'Cormac McCarthy',
      'Joan Didion',
      'Raymond Carver',
      'Philip Roth',
      'James Baldwin',
      'Marilynne Robinson',
      'Donna Tartt',
      'Colson Whitehead',
      'Louise Erdrich',
      'Toni Cade Bambara',
      'John Updike',
    ])
  }

  if (normalizedThemeQuery.includes('shakespearean character')) {
    return reduceFullNamesToPreferredLabels([
      'Viola',
      'Rosalind',
      'Beatrice',
      'Cordelia',
      'Miranda',
      'Juliet',
      'Portia',
      'Ophelia',
      'Bianca',
      'Adriana',
      'Helena',
      'Cressida',
      'Imogen',
      'Desdemona',
      'Perdita',
      'Hermione',
      'Luciana',
      'Titania',
      'Isabella',
      'Mariana',
      'Sebastian',
      'Cassio',
      'Mercutio',
      'Benedick',
      'Horatio',
    ])
  }

  return []
}

function reduceFullNamesToPreferredLabels(fullNames: string[]) {
  const normalizedSurnameCounts = new Map<string, number>()
  const surnameCandidates = fullNames.map((fullName) => extractSurnameCandidate(fullName))

  for (const surnameCandidate of surnameCandidates) {
    const normalizedSurname = normalizeScenarioField(surnameCandidate)

    if (!normalizedSurname) {
      continue
    }

    normalizedSurnameCounts.set(normalizedSurname, (normalizedSurnameCounts.get(normalizedSurname) || 0) + 1)
  }

  const usedLabels = new Set<string>()

  return fullNames.map((fullName, index) => {
    const normalizedFullName = fullName.replace(/\s+/g, ' ').trim()
    const fullNameParts = normalizedFullName.split(/\s+/).filter(Boolean)
    const firstName = fullNameParts[0] || ''
    const surnameCandidate = surnameCandidates[index]
    const normalizedSurname = normalizeScenarioField(surnameCandidate)
    const normalizedFirstName = normalizeScenarioField(firstName)
    const surnameIsUnique =
      normalizedSurname && surnameCandidate && (normalizedSurnameCounts.get(normalizedSurname) || 0) === 1 && !usedLabels.has(normalizedSurname)

    if (surnameIsUnique) {
      usedLabels.add(normalizedSurname)
      return surnameCandidate
    }

    if (normalizedFirstName && !usedLabels.has(normalizedFirstName)) {
      usedLabels.add(normalizedFirstName)
      return firstName
    }

    const normalizedFull = normalizeScenarioField(normalizedFullName)
    usedLabels.add(normalizedFull)
    return normalizedFullName
  })
}

function extractSurnameCandidate(fullName: string) {
  const fullNameParts = fullName.replace(/\s+/g, ' ').trim().split(/\s+/).filter(Boolean)

  if (fullNameParts.length <= 1) {
    return fullNameParts[0] || ''
  }

  const nonSuffixParts = fullNameParts.filter((part) => !['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv'].includes(part.toLowerCase()))

  return nonSuffixParts[nonSuffixParts.length - 1] || fullNameParts[fullNameParts.length - 1] || ''
}

function normalizeThemeWord(word: string) {
  const trimmedWord = word.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '').trim()
  const lowerWord = trimmedWord.toLowerCase()

  if (!lowerWord) {
    return ''
  }

  if (lowerWord.endsWith('ies') && lowerWord.length > 4) {
    return `${lowerWord.slice(0, -3)}y`
  }

  if (lowerWord.endsWith('s') && !lowerWord.endsWith('ss') && lowerWord.length > 3) {
    return lowerWord.slice(0, -1)
  }

  return lowerWord
}

function titleCaseThemeWord(word: string) {
  return word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ''
}

function buildCrudSeedSuffix(baseLabel: string) {
  const resolvedBaseLabel = baseLabel.trim()

  if (!resolvedBaseLabel) {
    return ''
  }

  const fullCrudName = buildCrudName(resolvedBaseLabel)

  if (fullCrudName === resolvedBaseLabel) {
    return ''
  }

  if (fullCrudName.startsWith(`${resolvedBaseLabel} `)) {
    return fullCrudName.slice(resolvedBaseLabel.length + 1).trim()
  }

  return fullCrudName.trim()
}

async function readResourceSeedStateFile(filePath: string): Promise<StoredResourceSeedState> {
  try {
    const rawState = await readFile(filePath, 'utf8')
    const parsedState = JSON.parse(rawState) as StoredResourceSeedState

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

async function readTrackedSeededResourceStateFile(filePath: string): Promise<TrackedSeededResourceState> {
  try {
    const rawState = await readFile(filePath, 'utf8')
    const parsedState = JSON.parse(rawState) as TrackedSeededResourceState

    return {
      resources: deduplicateTrackedSeededResources(Array.isArray(parsedState.resources) ? parsedState.resources : []),
    }
  } catch (error) {
    if (isMissingFileError(error)) {
      return { resources: [] }
    }

    throw error
  }
}

function deduplicateTrackedSeededResources(resources: TrackedSeededResource[]) {
  return Array.from(
    new Map(resources.map((resource) => [resource.resourceId, resource])).values(),
  ).sort((leftResource, rightResource) => leftResource.resourceId - rightResource.resourceId)
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
