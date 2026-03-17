import { test } from '@playwright/test'
import { AdminPanelPage } from '../../page-objects/ap/AdminPanelPage'
import { APLoginPage } from '../../page-objects/ap/APLoginPage'

const sectionExpectations = [
  {
    name: 'CRM',
    path: '/crm',
    texts: ['CRM boards', 'Opportunities', 'Proposals', 'Reminders', 'Tasks', 'Documents', 'Messages', 'Customer segments'],
  },
  {
    name: 'Community',
    path: '/content',
    texts: ['Articles', 'FAQ', 'Perks', 'Announcements', 'Events calendar', 'Events list', 'Forms', 'Surveys', 'Virtual rooms'],
  },
  {
    name: 'Finance',
    path: '/finance',
    texts: ['Invoices', 'Contracts', 'Contracts calendar', 'Revenue forecast', 'Discount codes', 'Ledgers'],
  },
  {
    name: 'Operations',
    path: '/operations',
    texts: ['Members & contacts', 'Visitors', 'Calendar', 'List', 'Customers on site', 'WiFi Access tokens', 'Help-desk messages', 'Deliveries'],
  },
  {
    name: 'Inventory',
    path: '/billing',
    texts: ['Products', 'Plans', 'Passes', 'Floor plans', 'Equipment', 'Resources', 'Resource types', 'Prices'],
  },
  {
    name: 'Analytics',
    path: '/analytics',
    texts: ['Reports', 'Revenue forecast', 'Trends', 'Resource Demand', 'Heat-maps', 'Hot Desks Demand', 'Churn and Engagement'],
  },
]

test.describe('Admin panel overview', () => {
  let adminPanelPage: AdminPanelPage
  let loginPage: APLoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new APLoginPage(page)
    adminPanelPage = new AdminPanelPage(page)
    await loginPage.login()
  })

  test('shows the expected primary navigation', async () => {
    await adminPanelPage.expectPrimaryNavigation()
  })

  for (const section of sectionExpectations) {
    test(`exposes the expected ${section.name} capabilities`, async () => {
      await adminPanelPage.expectSectionOverview(section.path, section.texts)
    })
  }
})
