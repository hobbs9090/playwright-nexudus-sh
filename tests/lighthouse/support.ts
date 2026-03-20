import type { Page, TestInfo } from '@playwright/test'
import { chromium } from '@playwright/test'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import type { Config, Flags } from 'lighthouse'
import lighthouseDesktopConfig from 'lighthouse/core/config/lr-desktop-config.js'
import { playAudit, type playwrightLighthouseResult } from 'playwright-lighthouse'
import { shouldUseHeadlessBrowser } from '../../helpers'

export type LighthouseThresholds = {
  performance?: number
  accessibility?: number
  'best-practices'?: number
  seo?: number
  pwa?: number
}

type LighthouseAuditOptions = {
  auditName: string
  baseURL: string
  testInfo: TestInfo
  authenticate: (page: Page) => Promise<void>
  thresholds?: LighthouseThresholds
}

const viewport = { width: 1280, height: 1200 }
const lighthouseCategories = [
  'performance',
  'accessibility',
  'best-practices',
  'seo',
  'pwa',
] as const

const defaultThresholds: LighthouseThresholds = {
  performance: getThresholdEnvVar('LIGHTHOUSE_MIN_PERFORMANCE', 35),
  accessibility: getThresholdEnvVar('LIGHTHOUSE_MIN_ACCESSIBILITY', 55),
  'best-practices': getThresholdEnvVar('LIGHTHOUSE_MIN_BEST_PRACTICES', 50),
}

function getThresholdEnvVar(name: string, fallback: number) {
  const rawValue = process.env[name]?.trim()

  if (!rawValue) {
    return fallback
  }

  const parsedValue = Number(rawValue)

  if (!Number.isFinite(parsedValue) || parsedValue < 0 || parsedValue > 100) {
    throw new Error(`${name} must be a number between 0 and 100.`)
  }

  return parsedValue
}

function normalizeReportName(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'lighthouse-audit'
  )
}

function getLighthouseOptions(): Flags {
  return {
    disableStorageReset: true,
  }
}

function getRoundedCategoryScores(
  auditResult: playwrightLighthouseResult,
  thresholds: LighthouseThresholds,
): LighthouseThresholds {
  const scores: LighthouseThresholds = {}

  for (const category of lighthouseCategories) {
    if (typeof thresholds[category] !== 'number') {
      continue
    }

    const score = auditResult.lhr.categories[category]?.score

    if (typeof score !== 'number') {
      throw new Error(`Lighthouse did not return a numeric score for the ${category} category.`)
    }

    scores[category] = Math.round(score * 100)
  }

  return scores
}

function assertThresholdsUsingRoundedScores(scores: LighthouseThresholds, thresholds: LighthouseThresholds) {
  const passingMessages: string[] = []
  const failingMessages: string[] = []

  for (const category of lighthouseCategories) {
    const score = scores[category]
    const threshold = thresholds[category]

    if (typeof score !== 'number' || typeof threshold !== 'number') {
      continue
    }

    if (score < threshold) {
      failingMessages.push(`${category} score is ${score} and is under the ${threshold} threshold`)
      continue
    }

    passingMessages.push(`${category} score is ${score} and desired threshold was ${threshold}`)
  }

  console.log('')
  console.log('-------- lighthouse threshold results --------')
  console.log('')

  for (const message of passingMessages) {
    console.log(message)
  }

  if (failingMessages.length > 0) {
    throw new Error(
      [
        failingMessages.length === 1
          ? 'Lighthouse score is below the configured threshold.'
          : 'Multiple Lighthouse scores are below the configured thresholds.',
        '',
        ...failingMessages,
      ].join('\n'),
    )
  }
}

async function getAvailablePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()

      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Could not allocate a Lighthouse debugging port.')))
        return
      }

      server.close(() => resolve(address.port))
    })
  })
}

export async function runAuthenticatedLighthouseAudit({
  auditName,
  baseURL,
  testInfo,
  authenticate,
  thresholds = defaultThresholds,
}: LighthouseAuditOptions): Promise<playwrightLighthouseResult> {
  const port = await getAvailablePort()
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'playwright-lighthouse-'))
  const context = await chromium.launchPersistentContext(userDataDir, {
    args: [`--remote-debugging-port=${port}`],
    baseURL,
    headless: shouldUseHeadlessBrowser(),
    ignoreHTTPSErrors: true,
    viewport,
    screen: viewport,
  })

  try {
    const page = context.pages()[0] ?? (await context.newPage())

    await authenticate(page)
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => undefined)

    const auditResult = await playAudit({
      page,
      port,
      thresholds,
      ignoreError: true,
      disableLogs: true,
      opts: getLighthouseOptions(),
      config: lighthouseDesktopConfig as Config,
      reports: {
        formats: {
          html: true,
          json: true,
        },
        directory: path.join(testInfo.outputDir, 'lighthouse'),
        name: normalizeReportName(auditName),
      },
    })

    const roundedScores = getRoundedCategoryScores(auditResult, thresholds)

    assertThresholdsUsingRoundedScores(roundedScores, thresholds)

    return auditResult
  } finally {
    await context.close()
    await rm(userDataDir, { recursive: true, force: true })
  }
}
