import { apiFetch, type PagedResult } from './client.ts'
import type { Order, OrderStatus } from './orders.ts'

export type AdminOrder = Order & {
  customerName: string
  customerEmail: string
}

export type AdminOrdersQuery = {
  status?: OrderStatus
  page: number
  pageSize: number
}

export function getAdminOrders({ status, page, pageSize }: AdminOrdersQuery) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (status) params.set('status', status)
  return apiFetch<PagedResult<AdminOrder>>(`/api/admin/orders?${params}`)
}

export function updateOrderStatus(id: number, status: OrderStatus) {
  return apiFetch<AdminOrder>(`/api/admin/orders/${id}/status`, { method: 'PATCH', body: { status } })
}
