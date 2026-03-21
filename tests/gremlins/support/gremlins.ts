import path from 'node:path'
import { expect, type ConsoleMessage, type Page, type Request, type TestInfo } from '@playwright/test'

const gremlinsScriptPath = path.resolve(process.cwd(), 'node_modules/gremlins.js/dist/gremlins.min.js')
const defaultSeed = 1337
const defaultActionCount = 60
const defaultDelayMs = 35
const defaultMaxErrors = 5
const defaultBlockedTextSubstrings = ['log out', 'logout', 'delete', 'remove', 'collect', 'pay now', 'save', 'submit']
const meaningfulRequestResourceTypes = new Set(['document', 'fetch', 'script', 'stylesheet', 'xhr'])

export const supportedGremlinSpecies = ['clicker', 'toucher', 'formFiller', 'scroller'] as const

export type GremlinSpeciesName = (typeof supportedGremlinSpecies)[number]

export type GremlinsStopConditions = {
  maxErrors: number
  requiredSelector?: string
  stopOnExternalNavigation: boolean
  stopOnJsError: boolean
}

export type GremlinsRunOptions = {
  actionCount: number
  allowLinkClicks: boolean
  blockedTextSubstrings: string[]
  delayMs: number
  ignoredPageErrorSubstrings: string[]
  interactionSelector?: string
  label: string
  seed: number
  species: GremlinSpeciesName[]
  stopConditions: GremlinsStopConditions
}

type GremlinsBrowserSummary = {
  finalTitle: string
  finalUrl: string
  gremlinLogCount: number
  gremlinLogSample: string[]
  readyState: string
  stopReason: string | null
}

export type GremlinsFailedRequest = {
  failureText: string
  method: string
  resourceType: string
  url: string
}

export type GremlinsRunSummary = GremlinsBrowserSummary & {
  consoleErrors: string[]
  pageCrashed: boolean
  pageErrors: string[]
  failedRequests: GremlinsFailedRequest[]
}

type GremlinsBrowserRuntimeOptions = {
  actionCount: number
  allowLinkClicks: boolean
  blockedTextSubstrings: string[]
  delayMs: number
  initialOrigin: string
  interactionSelector?: string
  seed: number
  species: GremlinSpeciesName[]
  stopConditions: GremlinsStopConditions
}

export async function installGremlins(page: Page) {
  await page.addInitScript({ path: gremlinsScriptPath })
}

export function buildGremlinsRunOptions(label: string, overrides: Partial<GremlinsRunOptions> = {}): GremlinsRunOptions {
  const envSpecies = parseGremlinSpecies(process.env.GREMLINS_SPECIES)

  return {
    label,
    seed: parsePositiveInteger(process.env.GREMLINS_SEED, defaultSeed),
    actionCount: parsePositiveInteger(process.env.GREMLINS_ACTIONS, defaultActionCount),
    delayMs: parsePositiveInteger(process.env.GREMLINS_DELAY_MS, defaultDelayMs),
    allowLinkClicks: false,
    blockedTextSubstrings: defaultBlockedTextSubstrings,
    ignoredPageErrorSubstrings: [],
    species: envSpecies.length > 0 ? envSpecies : [...supportedGremlinSpecies],
    stopConditions: {
      maxErrors: parsePositiveInteger(process.env.GREMLINS_MAX_ERRORS, defaultMaxErrors),
      requiredSelector: 'main',
      stopOnExternalNavigation: true,
      stopOnJsError: true,
    },
    ...overrides,
    stopConditions: {
      maxErrors: parsePositiveInteger(process.env.GREMLINS_MAX_ERRORS, defaultMaxErrors),
      requiredSelector: 'main',
      stopOnExternalNavigation: true,
      stopOnJsError: true,
      ...overrides.stopConditions,
    },
    species: overrides.species ?? (envSpecies.length > 0 ? envSpecies : [...supportedGremlinSpecies]),
    blockedTextSubstrings: overrides.blockedTextSubstrings ?? defaultBlockedTextSubstrings,
  }
}

export function announceGremlinsRun(options: GremlinsRunOptions, testInfo: TestInfo) {
  testInfo.annotations.push({ type: 'gremlins-seed', description: String(options.seed) })
  console.log(
    `[gremlins] ${options.label} seed=${options.seed} actions=${options.actionCount} delayMs=${options.delayMs} species=${options.species.join(',')}`,
  )
}

export async function attachGremlinsArtifacts(testInfo: TestInfo, options: GremlinsRunOptions, summary: GremlinsRunSummary) {
  await testInfo.attach('gremlins-options', {
    body: JSON.stringify(options, null, 2),
    contentType: 'application/json',
  })
  await testInfo.attach('gremlins-summary', {
    body: JSON.stringify(summary, null, 2),
    contentType: 'application/json',
  })
}

export async function runGremlinsAttack(page: Page, options: GremlinsRunOptions) {
  const initialOrigin = getPageOrigin(page.url())
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const failedRequests: GremlinsFailedRequest[] = []
  let pageCrashed = false

  const handleConsole = (message: ConsoleMessage) => {
    const messageText = message.text().trim()

    if (!messageText || messageText.startsWith('[gremlins]')) {
      return
    }

    if (message.type() === 'error') {
      consoleErrors.push(messageText)
    }
  }
  const handlePageError = (error: Error) => {
    const errorText = `${error.message || String(error)}\n${error.stack || ''}`.trim()

    if (options.ignoredPageErrorSubstrings.some((snippet) => errorText.includes(snippet))) {
      return
    }

    pageErrors.push(errorText)
  }
  const handleRequestFailed = (request: Request) => {
    const failureText = request.failure()?.errorText || 'Unknown request failure'

    if (!shouldCaptureFailedRequest(request, failureText, initialOrigin)) {
      return
    }

    failedRequests.push({
      failureText,
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
    })
  }
  const handleCrash = () => {
    pageCrashed = true
  }

  page.on('console', handleConsole)
  page.on('pageerror', handlePageError)
  page.on('requestfailed', handleRequestFailed)
  page.on('crash', handleCrash)

  try {
    const browserSummary = await page.evaluate(async (runtimeOptions: GremlinsBrowserRuntimeOptions) => {
      const browserWindow = window as Window & typeof globalThis & { gremlins?: any }
      const browserGremlins = browserWindow.gremlins

      if (!browserGremlins?.createHorde) {
        throw new Error('gremlins.js was not available on the page.')
      }

      let gremlinLogCount = 0
      const gremlinLogSample: string[] = []
      let stopReason: string | null = null
      let navigationMonitor: number | null = null
      let horde: { stop: () => void; unleash: () => Promise<void> } | null = null
      const sampleLimit = 25
      const blockedTextSubstrings = runtimeOptions.blockedTextSubstrings.map((value) => value.toLowerCase())
      const interactionSelector = runtimeOptions.interactionSelector?.trim()
      const quietAction = () => {}

      const formatLogPart = (value: unknown) => {
        if (value instanceof Element) {
          return `<${value.tagName.toLowerCase()}>`
        }

        if (value instanceof Error) {
          return value.message
        }

        if (typeof value === 'string') {
          return value
        }

        try {
          return JSON.stringify(value)
        } catch {
          return String(value)
        }
      }

      const storeGremlinLog = (...parts: unknown[]) => {
        gremlinLogCount += 1

        if (gremlinLogSample.length < sampleLimit) {
          gremlinLogSample.push(parts.map(formatLogPart).join(' ').trim())
        }
      }

      const getInteractionTarget = (element: Element) =>
        element.closest('a,button,input,select,textarea,label,[role="button"],[tabindex]') || element

      const getTargetText = (element: Element) =>
        [
          element.textContent,
          element.getAttribute('aria-label'),
          element.getAttribute('placeholder'),
          element.getAttribute('title'),
          element.getAttribute('value'),
        ]
          .filter(Boolean)
          .join(' ')
          .trim()
          .toLowerCase()

      const stopAttack = (reason: string) => {
        if (stopReason) {
          return
        }

        stopReason = reason
        horde?.stop()
      }

      const canInteract = (element: Element, mode: 'click' | 'touch' | 'fill') => {
        const target = getInteractionTarget(element)

        if (!(target instanceof HTMLElement)) {
          return false
        }

        if (target.closest('[data-gremlins-ignore="true"]')) {
          return false
        }

        if (interactionSelector && !target.closest(interactionSelector)) {
          return false
        }

        if (
          target.matches(
            'button[disabled], input[disabled], textarea[disabled], select[disabled], input[type="file"], button[type="submit"], input[type="submit"]',
          )
        ) {
          return false
        }

        if (target.getAttribute('aria-disabled') === 'true') {
          return false
        }

        if (blockedTextSubstrings.some((snippet) => getTargetText(target).includes(snippet))) {
          return false
        }

        if (target instanceof HTMLAnchorElement) {
          if (!runtimeOptions.allowLinkClicks) {
            return false
          }

          const href = target.getAttribute('href')?.trim() || ''

          if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
            return false
          }

          if (target.target && target.target !== '_self') {
            return false
          }

          try {
            const targetUrl = new URL(target.href, window.location.href)

            if (runtimeOptions.stopConditions.stopOnExternalNavigation && targetUrl.origin !== runtimeOptions.initialOrigin) {
              return false
            }
          } catch {
            return false
          }
        }

        if (mode === 'fill') {
          if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
            return false
          }

          if (target instanceof HTMLInputElement && ['hidden', 'submit', 'button', 'file'].includes(target.type)) {
            return false
          }
        }

        return true
      }

      const onWindowError = (event: Event) => {
        if (!runtimeOptions.stopConditions.stopOnJsError) {
          return
        }

        if (typeof ErrorEvent !== 'undefined' && event instanceof ErrorEvent) {
          stopAttack(`page error: ${event.message || event.error?.message || 'unknown error'}`)
        }
      }

      const onUnhandledRejection = (event: Event) => {
        if (!runtimeOptions.stopConditions.stopOnJsError) {
          return
        }

        const rejectionEvent = event as PromiseRejectionEvent
        const reason =
          rejectionEvent.reason instanceof Error
            ? rejectionEvent.reason.message
            : String(rejectionEvent.reason ?? 'unknown rejection')

        stopAttack(`unhandled rejection: ${reason}`)
      }

      window.addEventListener('error', onWindowError)
      window.addEventListener('unhandledrejection', onUnhandledRejection)

      try {
        const configuredSpecies = {
          clicker: browserGremlins.species.clicker({
            canClick: (element: Element) => canInteract(element, 'click'),
            clickTypes: ['click', 'click', 'click', 'mousedown', 'mouseup', 'mouseover'],
            log: false,
            showAction: quietAction,
          }),
          toucher: browserGremlins.species.toucher({
            canTouch: (element: Element) => canInteract(element, 'touch'),
            log: false,
            showAction: quietAction,
          }),
          formFiller: browserGremlins.species.formFiller({
            canFillElement: (element: Element) => canInteract(element, 'fill'),
            log: false,
            showAction: quietAction,
          }),
          scroller: browserGremlins.species.scroller({
            log: false,
            showAction: quietAction,
          }),
        }

        horde = browserGremlins.createHorde({
          logger: {
            error: (...parts: unknown[]) => {
              storeGremlinLog(...parts)
              console.error('[gremlins]', ...parts.map(formatLogPart))
            },
            info: (...parts: unknown[]) => storeGremlinLog(...parts),
            log: (...parts: unknown[]) => storeGremlinLog(...parts),
            warn: (...parts: unknown[]) => storeGremlinLog(...parts),
          },
          mogwais: [
            browserGremlins.mogwais.alert(),
            browserGremlins.mogwais.gizmo({ maxErrors: runtimeOptions.stopConditions.maxErrors }),
          ],
          randomizer: new browserGremlins.Chance(runtimeOptions.seed),
          species: runtimeOptions.species.map((speciesName) => configuredSpecies[speciesName]),
          strategies: [
            browserGremlins.strategies.distribution({
              delay: runtimeOptions.delayMs,
              nb: runtimeOptions.actionCount,
            }),
          ],
          window,
        })

        navigationMonitor = window.setInterval(() => {
          if (runtimeOptions.stopConditions.stopOnExternalNavigation && window.location.origin !== runtimeOptions.initialOrigin) {
            stopAttack(`external navigation: ${window.location.href}`)
          }

          if (
            runtimeOptions.stopConditions.requiredSelector &&
            !document.querySelector(runtimeOptions.stopConditions.requiredSelector)
          ) {
            stopAttack(`required selector missing: ${runtimeOptions.stopConditions.requiredSelector}`)
          }
        }, 50)

        await horde.unleash()
      } finally {
        if (navigationMonitor !== null) {
          window.clearInterval(navigationMonitor)
        }

        window.removeEventListener('error', onWindowError)
        window.removeEventListener('unhandledrejection', onUnhandledRejection)
      }

      return {
        gremlinLogCount,
        gremlinLogSample,
        stopReason,
      }
    }, {
      actionCount: options.actionCount,
      allowLinkClicks: options.allowLinkClicks,
      blockedTextSubstrings: options.blockedTextSubstrings,
      delayMs: options.delayMs,
      initialOrigin,
      interactionSelector: options.interactionSelector,
      seed: options.seed,
      species: options.species,
      stopConditions: options.stopConditions,
    } satisfies GremlinsBrowserRuntimeOptions)

    await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(250)

    const pageState = await page
      .evaluate(() => ({
        finalTitle: document.title,
        finalUrl: window.location.href,
        readyState: document.readyState,
      }))
      .catch(() => ({
        finalTitle: '',
        finalUrl: page.url(),
        readyState: 'unavailable',
      }))

    return {
      ...browserSummary,
      ...pageState,
      consoleErrors,
      pageCrashed,
      pageErrors,
      failedRequests,
    } satisfies GremlinsRunSummary
  } finally {
    page.off('console', handleConsole)
    page.off('pageerror', handlePageError)
    page.off('requestfailed', handleRequestFailed)
    page.off('crash', handleCrash)
  }
}

export function assertGremlinsRunHealthy(summary: GremlinsRunSummary) {
  expect(summary.pageCrashed, 'Expected the page to remain alive during the gremlins run.').toBe(false)
  expect(summary.pageErrors, formatArrayMessage('Expected no uncaught page errors during the gremlins run.', summary.pageErrors)).toEqual([])
  expect(summary.consoleErrors, formatArrayMessage('Expected no console.error output during the gremlins run.', summary.consoleErrors)).toEqual([])
  expect(
    summary.failedRequests,
    formatArrayMessage(
      'Expected no meaningful same-origin failed requests during the gremlins run.',
      summary.failedRequests.map((failedRequest) => `${failedRequest.method} ${failedRequest.resourceType} ${failedRequest.url} ${failedRequest.failureText}`),
    ),
  ).toEqual([])
  expect(summary.stopReason, `Expected gremlins to finish without hitting a stop condition. Received: ${summary.stopReason ?? 'none'}.`).toBeNull()
  expect(summary.finalUrl, 'Expected the page to keep a valid final URL after the gremlins run.').toBeTruthy()
  expect(summary.finalUrl.startsWith('chrome-error://'), `Expected not to end on a browser error page. Final URL was ${summary.finalUrl}.`).toBe(false)
  expect(['interactive', 'complete']).toContain(summary.readyState)
}

function parsePositiveInteger(rawValue: string | undefined, fallback: number) {
  if (!rawValue?.trim()) {
    return fallback
  }

  const parsedValue = Number.parseInt(rawValue, 10)

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`Expected a positive integer but received "${rawValue}".`)
  }

  return parsedValue
}

function parseGremlinSpecies(rawValue: string | undefined) {
  if (!rawValue?.trim()) {
    return []
  }

  const parsedSpecies = rawValue
    .split(',')
    .map((species) => species.trim())
    .filter(Boolean) as GremlinSpeciesName[]
  const invalidSpecies = parsedSpecies.filter((species) => !supportedGremlinSpecies.includes(species))

  if (invalidSpecies.length > 0) {
    throw new Error(
      `Unsupported GREMLINS_SPECIES values: ${invalidSpecies.join(', ')}. Supported species: ${supportedGremlinSpecies.join(', ')}.`,
    )
  }

  return parsedSpecies
}

function shouldCaptureFailedRequest(request: Request, failureText: string, initialOrigin: string) {
  if (!meaningfulRequestResourceTypes.has(request.resourceType())) {
    return false
  }

  if (/ERR_ABORTED|NS_BINDING_ABORTED|canceled|cancelled/i.test(failureText)) {
    return false
  }

  try {
    return new URL(request.url()).origin === initialOrigin
  } catch {
    return false
  }
}

function getPageOrigin(url: string) {
  try {
    return new URL(url).origin
  } catch {
    return url
  }
}

function formatArrayMessage(message: string, values: string[]) {
  if (values.length === 0) {
    return message
  }

  return `${message}\n${values.join('\n')}`
}
