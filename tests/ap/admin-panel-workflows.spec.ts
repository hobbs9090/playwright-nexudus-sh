import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { generateProductName } from '../../helpers'
import { AdminPanelPage } from '../../page-objects/ap/AdminPanelPage'
import { DeliveryPage } from '../../page-objects/ap/DeliveryPage'
import { EventPage } from '../../page-objects/ap/EventPage'
import { APLoginPage } from '../../page-objects/ap/APLoginPage'
import { ProductPage } from '../../page-objects/ap/ProductPage'
import { getConfiguredMemberName } from '../../test-environments'

const deliveryLabelPath = resolve(__dirname, '..', 'fixtures', 'delivery-label.pdf')
const collectionSignaturePath = resolve(__dirname, '..', 'fixtures', 'collection-signature.png')

function getApDeliveryMember() {
  return getConfiguredMemberName('NEXUDUS_AP_MEMBER_NAME')
}

function getApDeliveryReceivedBy() {
  return getConfiguredMemberName('NEXUDUS_AP_RECEIVED_BY_NAME')
}

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
    bodyTexts: ['Upcoming', 'Name', 'Start / end dates', /This table contains \d+ rows?/],
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
  let deliveryPage: DeliveryPage
  let eventPage: EventPage
  let loginPage: APLoginPage
  let productPage: ProductPage
  const productCountTimeout = 60000

  test.beforeEach(async ({ page }) => {
    loginPage = new APLoginPage(page)
    adminPanelPage = new AdminPanelPage(page)
    deliveryPage = new DeliveryPage(page)
    eventPage = new EventPage(page)
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

  test('can register a delivery, upload a label PDF, and assign it to a user @3093', async () => {
    test.slow()
    const apDeliveryMember = getApDeliveryMember()
    const apDeliveryReceivedBy = getApDeliveryReceivedBy()
    let createdDelivery:
      | {
          customerName: string
          deliveryType: number
          fileDataFileName: string | null
          id: number
          reference: string
        }
      | undefined

    try {
      createdDelivery = await deliveryPage.registerDeliveryForCustomer(apDeliveryMember, 'Parcel', deliveryLabelPath)
      expect(createdDelivery.customerName).toBe(apDeliveryMember)
      expect(createdDelivery.deliveryType).toBe(2)
      expect(createdDelivery.fileDataFileName).toBe('delivery-label.pdf')
      expect(createdDelivery.reference).not.toBe('')

      await deliveryPage.openDeliveryDetails(createdDelivery.id)
      await deliveryPage.assertAssignedCustomer(apDeliveryMember)
      await deliveryPage.assertDeliveryType('DeliveryType-2')
      await deliveryPage.assertReceivedByUser(apDeliveryReceivedBy)
    } finally {
      if (createdDelivery) {
        await deliveryPage.deleteDelivery(createdDelivery.id)
      }
    }
  })

  test('can add a collection signature to a delivery and mark it as collected @3093', async () => {
    test.slow()
    const apDeliveryMember = getApDeliveryMember()
    let createdDelivery:
      | {
          customerName: string
          deliveryType: number
          fileDataFileName: string | null
          id: number
          reference: string
        }
      | undefined

    try {
      createdDelivery = await deliveryPage.registerDeliveryForCustomer(apDeliveryMember, 'Parcel')
      await deliveryPage.openDeliveryDetails(createdDelivery.id)
      await deliveryPage.uploadCollectionSignature(collectionSignaturePath)

      const collectedDelivery = await deliveryPage.markCurrentDeliveryAsCollected()
      expect(collectedDelivery.collected).toBe(true)
      await expect.poll(() => deliveryPage.isPendingDeliveryVisible(createdDelivery.reference), { timeout: 30000 }).toBe(false)
    } finally {
      if (createdDelivery) {
        await deliveryPage.deleteDelivery(createdDelivery.id)
      }
    }
  })

  test(
    'can add an Astronomy Night event with plan, team, and specific coworker tickets @3424 @2994 @3140 @3352 @astronomy-night-ticket-targeting',
    async () => {
      test.slow()
      await eventPage.createAstronomyNightEvent()
    },
  )
})
