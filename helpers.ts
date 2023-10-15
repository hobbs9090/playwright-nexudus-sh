import { expect } from '@playwright/test'
import { ProductPage } from './page-objects/ProductPage'

export async function generateProductName() {
  const today = new Date()
  const day = today.getDate().toString().padStart(2, '0')
  const month = (today.getMonth() + 1).toString().padStart(2, '0')
  const dateStr = day + month // e.g. "1702"

  const hours = today.getHours().toString().padStart(2, '0')
  const minutes = today.getMinutes().toString().padStart(2, '0')
  const timeStr = hours + minutes // e.g. "1330"

  const chars = 'abcdefghijklmnopqrstuvwxyz'
  let randomString = ''
  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length)
    randomString += chars[randomIndex]
  }
  const product_name = `TestProduct ${dateStr} ${timeStr} ${randomString}`
  console.log(product_name)
  return product_name
}
