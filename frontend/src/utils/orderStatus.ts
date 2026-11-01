import type { OrderStatus } from '../api/orders.ts'

// Filtre listesi için tüm durumlar
export const ORDER_STATUSES: OrderStatus[] = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']

const FLOW: OrderStatus[] = ['Pending', 'Confirmed', 'Shipped', 'Delivered']

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  Pending: 'Beklemede',
  Confirmed: 'Onaylandı',
  Shipped: 'Kargoda',
  Delivered: 'Teslim edildi',
  Cancelled: 'İptal edildi',
}

// Backend'deki kuralın aynısı: sipariş yalnızca sıradaki adıma ilerler; iptal kargodan önce mümkündür.
export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  const index = FLOW.indexOf(status)
  return index === -1 ? null : (FLOW[index + 1] ?? null)
}

export function canAdminCancel(status: OrderStatus) {
  return status === 'Pending' || status === 'Confirmed'
}
