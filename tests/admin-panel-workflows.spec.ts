import { expect, test } from '@playwright/test'
import { generateProductName } from '../helpers'
import { AdminPanelPage } from '../page-objects/AdminPanelPage'
import { LoginPage } from '../page-objects/LoginPage'
import { ProductPage } from '../page-objects/ProductPage'

const workflowExpectations = [
  {
    actionButton: 'Add customer',
    bodyTexts: ['Full name', 'Plan', 'Registration', 'Status', /This table contains \d+ rows?/],
    name: 'members and contacts',
    path: '/operations/coworkers',
    urlPattern: /\/operations\/coworkers/,
  },
  {
    actionButton: 'Add booking',
    bodyTexts: ['Bookings', 'Resources', 'Month', 'Week', 'Day'],
    name: 'bookings calendar',
    path: '/operations/calendar/bookings',
    urlPattern: /\/operations\/calendar\/bookings/,
  },
  {
    actionButton: 'Add booking',
    bodyTexts: ['Upcoming', 'Resource / time', 'Price', /This table contains \d+ rows?/],
    name: 'bookings list',
    path: '/operations/bookings',
    urlPattern: /\/operations\/bookings/,
  },
  {
    actionButton: 'Add invoice',
    bodyTexts: ['Invoice number', 'Date', 'Total', /This table contains \d+ rows?/],
    name: 'invoices list',
    path: '/finance/coworkerInvoices',
    urlPattern: /\/finance\/coworkerInvoices/,
  },
  {
    actionButton: 'Add event',
    bodyTexts: ['Upcoming', 'Name', 'Start / end dates', /This table contains 0 rows?/],
    name: 'events list',
    path: '/content/calendarEvents',
    urlPattern: /\/content\/calendarEvents/,
  },
  {
    actionButton: 'Add task',
    bodyTexts: ['My pending tasks', 'Task is complete: no', 'Name', 'Customer', /This table contains 0 rows?/],
    name: 'tasks list',
    path: '/crm/coworkerTasks',
    urlPattern: /\/crm\/coworkerTasks/,
  },
  {
    actionButton: 'Add help-desk message',
    bodyTexts: ['Open', 'Subject', 'Customer', 'Department', /This table contains \d+ rows?/],
    name: 'help-desk queue',
    path: '/operations/helpDeskMessages',
    urlPattern: /\/operations\/helpDeskMessages/,
  },
]

test.describe('Admin panel workflows', () => {
  let adminPanelPage: AdminPanelPage
  let loginPage: LoginPage
  let productPage: ProductPage
  const productCountTimeout = process.env.CI ? 60000 : 30000

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    adminPanelPage = new AdminPanelPage(page)
    productPage = new ProductPage(page)
    await loginPage.login()
  })

  for (const workflow of workflowExpectations) {
    test(`loads the ${workflow.name} workflow`, async () => {
      await adminPanelPage.expectWorkflowPage(workflow)
    })
  }

  test('can add and delete a product from inventory', async () => {
    test.slow()
    await productPage.navigateTo()
    const initialProductCount = await productPage.getProductCount()
    const productName = await generateProductName()
    const productId = await productPage.addProduct(productName)

    await expect
      .poll(() => productPage.searchForProduct(productName), { timeout: productCountTimeout })
      .toBe(true)

    await productPage.deleteProduct(productId)

    await expect
      .poll(() => productPage.refreshProductCount(), { timeout: productCountTimeout })
      .toBe(initialProductCount)
  })
})
