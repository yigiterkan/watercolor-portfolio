import type { VariantType } from './artworks.ts'
import { ApiError, apiFetch } from './client.ts'

export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered'

export type OrderItem = {
  variantId: number
  artworkId: number
  title: string
  imageUrl: string | null
  variantType: VariantType
  widthCm: number
  heightCm: number
  quantity: number
  unitPrice: number
}

export type Order = {
  id: number
  status: OrderStatus
  totalPrice: number
  shippingAddress: string
  createdAt: string
  items: OrderItem[]
}

export type CreateOrderInput = {
  items: { variantId: number; quantity: number }[]
  shippingAddress: string
}

export function createOrder(input: CreateOrderInput) {
  return apiFetch<Order>('/api/orders', { method: 'POST', body: input })
}

export function getMyOrders() {
  return apiFetch<Order[]>('/api/orders')
}

export async function getOrder(id: number): Promise<Order | null> {
  try {
    return await apiFetch<Order>(`/api/orders/${id}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}
