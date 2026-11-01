const priceFormatter = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })
const timeFormatter = new Intl.DateTimeFormat('tr-TR', { timeStyle: 'short' })
const dateFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeStyle: 'short' })

export function formatPrice(price: number) {
  return priceFormatter.format(price)
}

export function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso))
}

export function formatTime(iso: string) {
  return timeFormatter.format(new Date(iso))
}
