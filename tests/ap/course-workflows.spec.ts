import { test } from '@playwright/test'
import { buildCrudName } from '../../helpers'
import { APLoginPage } from '../../page-objects/ap/APLoginPage'
import { CoursePage } from '../../page-objects/ap/CoursePage'

test.describe('Course workflows', () => {
  let coursePage: CoursePage
  let loginPage: APLoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new APLoginPage(page)
    coursePage = new CoursePage(page)
    await loginPage.login()
  })

  test('can create a flower arranging course in AP', async () => {
    test.slow()
    const courseTitle = buildCrudName('Flower Arranging')

    await coursePage.createCourse(courseTitle)
  })
})
