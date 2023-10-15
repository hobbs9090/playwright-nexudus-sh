import { test, expect } from '@playwright/test'
import { LoginPage } from '../page-objects/LoginPage'
import { generateProductName } from '../helpers'
import { ProductPage } from '../page-objects/ProductPage'
   
test.describe('Nexudus Test Suite', () => {
  let loginPage: LoginPage
  let productPage: ProductPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    productPage = new ProductPage(page)
  })

  test('#001 - log-in page shows a clear error message when invalid details are provided', async ({ page }) => {
    await loginPage.login('bad@example.com', 'badpassword', false)
    await loginPage.assertErrorMessage('The email or password is incorrect.')
  })

  test('#002 - Log-in page logs user in when valid details are provided', async ({ page }) => {
    await loginPage.login()
    await expect(page).toHaveURL('/dashboards/now')
  })

  test('#003 - Can add and delete a product from the products list.', async ({ page }) => {
    await loginPage.login()
    await productPage.navigateTo()
    const product_name = await generateProductName()
    await productPage.addProduct(product_name)
    expect(await productPage.searchForProduct(product_name)).toBe(true)
    await productPage.deleteProduct(product_name)
    expect(await productPage.searchForProduct(product_name)).toBe(false)
  })
})
