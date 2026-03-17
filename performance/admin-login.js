import { browser } from 'k6/browser'
import { check, fail } from 'k6'

const baseUrl = (__ENV.NEXUDUS_AP_BASE_URL || 'https://dashboard.nexudus.com/').replace(/\/+$/, '')
const email = (__ENV.NEXUDUS_AP_EMAIL || '').trim()
const password = (__ENV.NEXUDUS_AP_PASSWORD || '').trim()
const iterations = Number.parseInt(__ENV.K6_LOGIN_ITERATIONS || '1', 10)
const vus = Number.parseInt(__ENV.K6_LOGIN_VUS || '1', 10)
const maxDuration = __ENV.K6_LOGIN_MAX_DURATION || '2m'

if (!email || !password) {
  fail('Missing required environment variables: NEXUDUS_AP_EMAIL and NEXUDUS_AP_PASSWORD')
}

export const options = {
  scenarios: {
    admin_login: {
      executor: 'shared-iterations',
      vus,
      iterations,
      maxDuration,
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    checks: ['rate==1.0'],
  },
}

const blockingDialogNames = [
  'Meet NAI',
  'Unlock your potential with Nexudus Academy!',
  'Make your own home page.',
  'Recent updates',
]

const onboardingTourStorageEntries = {
  'nexudus.tours.387250060': '1',
  'nexudus.tours.823081104': '1',
  'nexudus.tours.1815550331': '1',
}

async function installBlockingDialogSuppression(context) {
  await context.addInitScript(`
    (() => {
      const blockingDialogNames = ${JSON.stringify(blockingDialogNames)};
      const onboardingTourStorageEntries = ${JSON.stringify(onboardingTourStorageEntries)};
      const styleId = 'codex-blocking-dialog-suppression';

      const hideElement = (element) => {
        if (!(element instanceof HTMLElement)) {
          return;
        }

        element.style.setProperty('display', 'none', 'important');
        element.style.setProperty('visibility', 'hidden', 'important');
        element.style.setProperty('pointer-events', 'none', 'important');
      };

      const ensureSuppressionStyle = () => {
        if (document.getElementById(styleId)) {
          return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = [
          '#headerFlyoutUpdates { display: none !important; visibility: hidden !important; pointer-events: none !important; }',
          'body:has(#headerFlyoutUpdates) .euiOverlayMask { display: none !important; visibility: hidden !important; pointer-events: none !important; }',
        ].join('\\n');

        (document.head || document.documentElement).appendChild(style);
      };

      const seedOnboardingDismissals = () => {
        for (const [key, value] of Object.entries(onboardingTourStorageEntries)) {
          window.localStorage.setItem(key, JSON.stringify(value));
        }
      };

      const dismissKnownDialogs = () => {
        ensureSuppressionStyle();
        seedOnboardingDismissals();

        const recentUpdatesFlyout = document.getElementById('headerFlyoutUpdates');
        if (recentUpdatesFlyout) {
          hideElement(recentUpdatesFlyout);
          document.body?.classList.remove('euiBody--hasFlyout');

          for (const overlay of document.querySelectorAll('.euiOverlayMask')) {
            hideElement(overlay);
          }
        }

        for (const dialog of document.querySelectorAll('[role="dialog"]')) {
          if (!(dialog instanceof HTMLElement)) {
            continue;
          }

          const text = dialog.textContent || '';
          if (!blockingDialogNames.some((dialogName) => text.includes(dialogName))) {
            continue;
          }

          hideElement(dialog);

          const closeButton = Array.from(dialog.querySelectorAll('button')).find((button) => {
            const buttonLabel = [button.textContent, button.getAttribute('aria-label'), button.getAttribute('title')]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();

            return buttonLabel.includes('close');
          });

          closeButton?.click();
        }
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', dismissKnownDialogs, { once: true });
      } else {
        dismissKnownDialogs();
      }
    })();
  `)
}

export default async function () {
  const context = await browser.newContext()
  await installBlockingDialogSuppression(context)

  const page = await context.newPage()

  try {
    await page.goto(`${baseUrl}/login?continue_to=%2F`, { waitUntil: 'domcontentloaded' })

    const emailInput = page.locator('input[name="Email"]')
    const passwordInput = page.locator('input[name="Password"]')
    const signInButton = page.locator('button').filter({ hasText: 'Sign in' })

    await emailInput.waitFor({ state: 'visible', timeout: 30000 })
    await passwordInput.waitFor({ state: 'visible', timeout: 30000 })

    await emailInput.fill(email)
    await passwordInput.fill(password)

    await Promise.all([
      page.waitForURL(/\/dashboards\/now/, { timeout: 30000 }),
      signInButton.click(),
    ])

    const dashboardLink = page.locator('a').filter({ hasText: /^Dashboard$/ }).first()
    await dashboardLink.waitFor({ state: 'visible', timeout: 30000 })

    const currentUrl = page.url()
    const dashboardVisible = await dashboardLink.isVisible()
    const passed = check(
      { currentUrl, dashboardVisible },
      {
        'redirected to the admin dashboard': (result) => result.currentUrl.includes('/dashboards/now'),
        'dashboard navigation is visible': (result) => result.dashboardVisible,
      },
    )

    if (!passed) {
      fail(`Authenticated login smoke test failed after sign-in. Current URL: ${currentUrl}`)
    }
  } catch (error) {
    fail(`Authenticated login smoke test failed: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    await page.close()
    await context.close()
  }
}
