const priceFormatter = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })
const dateFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeStyle: 'short' })

export function formatPrice(price: number) {
  return priceFormatter.format(price)
}

export function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso))
}
