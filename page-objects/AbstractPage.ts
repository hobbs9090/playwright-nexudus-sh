import { Page } from '@playwright/test'

export class AbstractPage {
  readonly page: Page
  readonly blockingDialogNames = ['Meet NAI', 'Unlock your potential with Nexudus Academy!']

  constructor(page: Page) {
    this.page = page
  }

  async wait(time: number) {
    await this.page.waitForTimeout(time)
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
            button.textContent?.trim().startsWith('Close')
          )

          closeButton?.click()
        }
      }, this.blockingDialogNames)

      const visibleDialogs = await Promise.all(
        this.blockingDialogNames.map((dialogName) =>
          this.page
            .getByRole('dialog', { name: dialogName })
            .isVisible()
            .catch(() => false)
        )
      )

      if (!visibleDialogs.some(Boolean)) {
        break
      }

      await this.page.waitForTimeout(500)
    }
  }
}
