import type { OrderStatus } from '../api/orders.ts'

export const ORDER_STATUSES: OrderStatus[] = ['Pending', 'Confirmed', 'Shipped', 'Delivered']

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  Pending: 'Beklemede',
  Confirmed: 'Onaylandı',
  Shipped: 'Kargoda',
  Delivered: 'Teslim edildi',
}

// Backend'deki kuralın aynısı: sipariş yalnızca sıradaki adıma ilerler.
export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  return ORDER_STATUSES[ORDER_STATUSES.indexOf(status) + 1] ?? null
}
