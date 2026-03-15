export function generateUniqueName(prefix: string) {
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

  return `${prefix} ${dateStr} ${timeStr} ${randomString}`
}

export async function generateProductName() {
  return generateUniqueName('TestProduct')
}
