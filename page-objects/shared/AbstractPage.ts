import { Page } from '@playwright/test'

export class AbstractPage {
  readonly page: Page
  readonly blockingDialogNames = ['Meet NAI', 'Unlock your potential with Nexudus Academy!', 'Make your own home page.', 'Recent updates']
  readonly onboardingTourStorageEntries = {
    'nexudus.tours.387250060': JSON.stringify('1'),
    'nexudus.tours.823081104': JSON.stringify('1'),
    'nexudus.tours.1815550331': JSON.stringify('1'),
  }
  private blockingDialogSuppressionInstalled = false

  constructor(page: Page) {
    this.page = page
  }

  async wait(time: number) {
    await this.page.waitForTimeout(time)
  }

  async installBlockingDialogSuppression() {
    if (this.blockingDialogSuppressionInstalled) {
      return
    }

    this.blockingDialogSuppressionInstalled = true

    await this.page.addInitScript(
      ({ blockingDialogNames, onboardingTourStorageEntries }) => {
        const styleId = 'codex-blocking-dialog-suppression'
        const suppressionIntervalWindowKey = '__codexBlockingDialogSuppressionInterval'

        const hideElement = (element: Element | null) => {
          if (!(element instanceof HTMLElement)) {
            return
          }

          element.style.setProperty('display', 'none', 'important')
          element.style.setProperty('visibility', 'hidden', 'important')
          element.style.setProperty('pointer-events', 'none', 'important')
        }

        const ensureSuppressionStyle = () => {
          if (document.getElementById(styleId)) {
            return
          }

          const style = document.createElement('style')
          style.id = styleId
          style.textContent = `
            #headerFlyoutUpdates {
              display: none !important;
              visibility: hidden !important;
              pointer-events: none !important;
            }

            body:has(#headerFlyoutUpdates) .euiOverlayMask {
              display: none !important;
              visibility: hidden !important;
              pointer-events: none !important;
            }
          `

          ;(document.head || document.documentElement).appendChild(style)
        }

        const seedOnboardingDismissals = () => {
          for (const [key, value] of Object.entries(onboardingTourStorageEntries)) {
            window.localStorage.setItem(key, value)
          }
        }

        const dismissKnownDialogs = () => {
          ensureSuppressionStyle()
          seedOnboardingDismissals()

          const recentUpdatesFlyout = document.getElementById('headerFlyoutUpdates')
          if (recentUpdatesFlyout) {
            hideElement(recentUpdatesFlyout)
            document.body?.classList.remove('euiBody--hasFlyout')

            for (const overlay of document.querySelectorAll('.euiOverlayMask')) {
              hideElement(overlay)
            }
          }

          for (const dialog of document.querySelectorAll('[role="dialog"]')) {
            if (!(dialog instanceof HTMLElement)) {
              continue
            }

            const text = dialog.textContent || ''
            const isKnownBlockingDialog = blockingDialogNames.some((dialogName) => text.includes(dialogName))

            if (!isKnownBlockingDialog) {
              continue
            }

            hideElement(dialog)

            const closeButton = Array.from(dialog.querySelectorAll('button')).find((button) => {
              const buttonLabel = [button.textContent, button.getAttribute('aria-label'), button.getAttribute('title')]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()

              return buttonLabel.includes('close')
            })

            closeButton?.click()
          }
        }

        const startSuppression = () => {
          dismissKnownDialogs()

          const intervalWindow = window as Window & {
            [suppressionIntervalWindowKey]?: number
          }

          if (intervalWindow[suppressionIntervalWindowKey]) {
            window.clearInterval(intervalWindow[suppressionIntervalWindowKey])
          }

          intervalWindow[suppressionIntervalWindowKey] = window.setInterval(dismissKnownDialogs, 250)

          window.setTimeout(() => {
            const intervalId = intervalWindow[suppressionIntervalWindowKey]

            if (intervalId) {
              window.clearInterval(intervalId)
              delete intervalWindow[suppressionIntervalWindowKey]
            }
          }, 15000)

          new MutationObserver(dismissKnownDialogs).observe(document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true,
          })
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', startSuppression, { once: true })
        } else {
          startSuppression()
        }
      },
      {
        blockingDialogNames: this.blockingDialogNames,
        onboardingTourStorageEntries: this.onboardingTourStorageEntries,
      }
    )
  }

  async dismissBlockingDialogs() {
    for (let attempt = 0; attempt < 8; attempt++) {
      await this.page.evaluate((dialogNames) => {
        const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'))

        for (const dialog of dialogs) {
          const text = dialog.textContent || ''
          const matchesKnownDialog = dialogNames.some((dialogName) => text.includes(dialogName))

          if (!matchesKnownDialog) {
            continue
          }

          const closeButton = Array.from(dialog.querySelectorAll('button')).find((button) =>
            [button.textContent, button.getAttribute('aria-label'), button.getAttribute('title')]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes('close')
          )

          closeButton?.click()
        }
      }, this.blockingDialogNames)

      const visibleDialogs = await Promise.all(
        this.blockingDialogNames.map((dialogName) =>
          this.page.locator('[role="dialog"]').filter({ hasText: dialogName }).first().isVisible().catch(() => false)
        )
      )

      if (!visibleDialogs.some(Boolean)) {
        break
      }

      await this.page.waitForTimeout(500)
    }
  }
}
