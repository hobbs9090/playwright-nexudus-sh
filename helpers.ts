import { execSync } from 'node:child_process'

export function generateUniqueName(prefix: string, randomStringPrefix: string = '') {
  const today = new Date()
  const day = today.getDate().toString().padStart(2, '0')
  const month = (today.getMonth() + 1).toString().padStart(2, '0')
  const dateStr = day + month // e.g. "1702"

  const hours = today.getHours().toString().padStart(2, '0')
  const minutes = today.getMinutes().toString().padStart(2, '0')
  const timeStr = hours + minutes // e.g. "1330"

  const chars = 'abcdefghijklmnopqrstuvwxyz'
  let randomString = ''
  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length)
    randomString += chars[randomIndex]
  }

  return `${prefix} ${dateStr} ${timeStr} ${randomStringPrefix}${randomString}`
}

export function shouldAppendCrudRandomSeed() {
  const rawValue = process.env.CRUD_APPEND_RANDOM_SEED?.trim().toLowerCase()

  if (!rawValue) {
    return true
  }

  return !['0', 'false', 'no', 'off'].includes(rawValue)
}

export function buildCrudName(baseName: string) {
  if (!shouldAppendCrudRandomSeed()) {
    return baseName
  }

  return generateUniqueName(baseName, getContributorInitials())
}

export async function generateProductName() {
  return buildCrudName('TestProduct')
}

export function requireEnvVar(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. See README.md for setup instructions.`)
  }

  return value
}

export function getContributorInitials() {
  const configuredInitials = process.env.NEXUDUS_CONTRIBUTOR_INITIALS?.trim()

  if (configuredInitials) {
    return configuredInitials.toLowerCase()
  }

  const possibleNames = [process.env.GIT_AUTHOR_NAME, process.env.GIT_COMMITTER_NAME]

  try {
    possibleNames.push(execSync('git config user.name', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim())
  } catch {
    // Fall through to the empty-string fallback below.
  }

  const contributorName = possibleNames.find((name) => name?.trim())?.trim()

  if (!contributorName) {
    return ''
  }

  const initials = contributorName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toLowerCase() || '')
    .join('')

  return initials
}
