import { expect, Locator, Page } from '@playwright/test'
import { AbstractPage } from '../shared/AbstractPage'

type MPHomeContentData = {
  businessName: string
  pricePlans: string[]
  products: string[]
  featuredArticles: Array<{
    author: string
    title: string
  }>
  locations: Array<{
    address: string
    name: string
  }>
}

export class MPHomePage extends AbstractPage {
  readonly heroSignInLink: Locator
  readonly heroWelcomeHeading: Locator
  readonly headerSignInLink: Locator
  readonly dismissStartupNoticeButton: Locator
  readonly footer: Locator
  readonly footerLanguageSelector: Locator

  constructor(page: Page) {
    super(page)
    this.heroSignInLink = page.getByRole('link', { name: 'Sign in here' }).first()
    this.heroWelcomeHeading = page.getByRole('heading', { name: /Welcome to / }).first()
    this.headerSignInLink = page.getByRole('link', { name: 'Sign in' }).first()
    this.dismissStartupNoticeButton = page.getByRole('button', { name: 'Okay, got it!' })
    this.footer = page.getByRole('contentinfo')
    this.footerLanguageSelector = this.footer.getByRole('combobox').first()
  }

  async goto(pathOrUrl: string = '/home') {
    await this.page.goto(pathOrUrl)
    await this.dismissStartupNoticeIfPresent()
  }

  async getConfiguredContentData(): Promise<MPHomeContentData> {
    return await this.page.evaluate(() => {
      const mobxStore = (window as Window & { __NEXT_DATA__?: { props?: { mobxStore?: Record<string, unknown> } } })
        .__NEXT_DATA__?.props?.mobxStore as
        | {
            appStore?: {
              business?: {
                Address?: string
                Businesses?: Array<{ Address?: string; Name?: string }>
                Name?: string
              }
              homePage?: {
                HomeBlogPosts?: Array<{ PostedBy?: { FullName?: string }; Title?: string }>
                PricePlans?: Array<{ Name?: string }>
                Products?: Array<{ Name?: string }>
              }
            }
          }
        | undefined

      const appStore = mobxStore?.appStore || {}
      const business = appStore.business || {}
      const homePage = appStore.homePage || {}

      const featuredArticles = (homePage.HomeBlogPosts || [])
        .slice(0, 2)
        .map((post) => ({
          author: post.PostedBy?.FullName || '',
          title: post.Title || '',
        }))

      return {
        businessName: business.Name || '',
        featuredArticles,
        locations: [
          ...(business.Name ? [{ address: business.Address || '', name: business.Name }] : []),
          ...((business.Businesses || []).map((location) => ({
            address: location.Address || '',
            name: location.Name || '',
          })) || []),
        ],
        pricePlans: (homePage.PricePlans || []).map((plan) => plan.Name || '').filter(Boolean),
        products: (homePage.Products || []).map((product) => product.Name || '').filter(Boolean),
      }
    })
  }

  async dismissStartupNoticeIfPresent() {
    const startupNoticeVisible = await this.dismissStartupNoticeButton.isVisible().catch(() => false)

    if (startupNoticeVisible) {
      await this.dismissStartupNoticeButton.click()
      return
    }

    await this.dismissStartupNoticeButton
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(async () => {
        await this.dismissStartupNoticeButton.click()
      })
      .catch(() => {})
  }

  async assertPublicMarketingEntryPointsVisible(businessName: string) {
    await expect(this.heroWelcomeHeading).toHaveText(new RegExp(`^Welcome to ${escapeRegExp(businessName)}$`))
    await expect(this.headerSignInLink).toBeVisible()
    await expect(this.heroSignInLink).toBeVisible()

    for (const quickAccessLink of ['Events', 'Members', 'Bookings', 'Community']) {
      await expect(this.page.getByRole('link', { name: quickAccessLink }).first()).toBeVisible()
    }
  }

  async goToHeaderSignIn() {
    await this.headerSignInLink.click()
  }

  async assertFooterBrandingVisible(businessName: string) {
    const currentYear = new Date().getFullYear().toString()

    await expect(this.footer.getByRole('img', { name: businessName })).toBeVisible()
    await expect(this.footer).toContainText(`${currentYear} © ${businessName}. All rights reserved.`)
  }

  async getFooterText() {
    await expect(this.footer).toBeVisible()
    return (await this.footer.innerText()).trim()
  }

  async assertFooterHeadingVisible(...candidateLabels: string[]) {
    await expect(
      this.footer.getByRole('heading', {
        name: new RegExp(`^(${candidateLabels.map(escapeRegExp).join('|')})$`, 'i'),
      }).first(),
    ).toBeVisible()
  }

  async assertFooterLinkVisible(linkLabel: string) {
    await expect(this.footer.getByRole('link', { exact: true, name: linkLabel }).first()).toBeVisible()
  }

  async assertFooterLinksVisible(linkLabels: string[]) {
    for (const linkLabel of linkLabels) {
      await this.assertFooterLinkVisible(linkLabel)
    }
  }

  async clickFooterLink(linkLabel: string) {
    await this.footer.getByRole('link', { exact: true, name: linkLabel }).first().click()
  }

  async assertFooterSayingVisible(sayingText: string) {
    await expect(this.footer).toContainText(sayingText)
  }

  async assertFooterSayingAuthorVisible(authorText: string) {
    await expect(this.footer).toContainText(authorText)
  }

  async assertFooterSocialLinkVisible(href: string) {
    await expect(this.footer.locator(`a[href="${href}"], a[href="${href}/"]`).first()).toBeVisible()
  }

  async hasFooterSocialLink(href: string) {
    return await this.footer
      .locator(`a[href="${href}"], a[href="${href}/"]`)
      .first()
      .isVisible()
      .catch(() => false)
  }

  async getSelectedFooterLanguageLabel() {
    await expect(this.footerLanguageSelector).toBeVisible()

    return (
      (await this.footerLanguageSelector.evaluate((element) => {
        if (!(element instanceof HTMLSelectElement)) {
          return ''
        }

        return element.selectedOptions[0]?.textContent?.trim() || ''
      })) || ''
    ).trim()
  }

  async selectFooterLanguage(candidateLabels: string[]) {
    await expect(this.footerLanguageSelector).toBeVisible()

    const availableLabels = (
      await this.footerLanguageSelector.evaluate((element) => {
        if (!(element instanceof HTMLSelectElement)) {
          return []
        }

        return Array.from(element.options).map((option) => option.textContent?.trim() || '')
      })
    ).filter(Boolean)
    const targetLabel = candidateLabels.find((candidateLabel) => availableLabels.includes(candidateLabel))

    if (!targetLabel) {
      throw new Error(
        `Could not find any footer language option matching: ${candidateLabels.join(', ')}. Available: ${availableLabels.join(', ')}.`,
      )
    }

    await this.footerLanguageSelector.selectOption({ label: targetLabel })

    await expect
      .poll(async () => await this.getSelectedFooterLanguageLabel(), { timeout: 10000 })
      .toBe(targetLabel)

    return targetLabel
  }

  async scrollToFooterAndPause(pauseMs: number = 15000) {
    await this.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await this.page.evaluate(() => {
      const maxScrollTop = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
      )

      window.scrollTo({ top: maxScrollTop, behavior: 'smooth' })
    })
    await expect(this.footer).toBeVisible()
    await this.page.waitForTimeout(pauseMs)
  }

  async assertConfiguredPlansAndProductsVisible(data: Pick<MPHomeContentData, 'pricePlans' | 'products'>) {
    for (const pricePlan of data.pricePlans) {
      await expect(this.page.getByRole('heading', { exact: true, name: pricePlan })).toBeVisible()
    }

    for (const product of data.products) {
      await expect(this.page.getByRole('heading', { exact: true, name: product })).toBeVisible()
    }
  }

  async assertConfiguredFeaturedArticlesVisible(data: Pick<MPHomeContentData, 'featuredArticles'>) {
    for (const article of data.featuredArticles) {
      await expect(this.page.getByRole('link', { exact: true, name: article.title })).toBeVisible()

      if (article.author) {
        await expect(this.page.getByText(article.author, { exact: true }).first()).toBeVisible()
      }
    }
  }

  async assertConfiguredLocationsVisible(data: Pick<MPHomeContentData, 'locations'>) {
    const mapLinks = this.page.getByRole('link', { name: 'Map' })

    for (const location of data.locations) {
      await expect(this.page.getByRole('heading', { exact: true, name: location.name })).toBeVisible()

      if (location.address) {
        await expect(this.page.getByText(location.address, { exact: true }).first()).toBeVisible()
      }
    }

    await expect(mapLinks).toHaveCount(data.locations.length)
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
