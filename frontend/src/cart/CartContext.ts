import { createContext, useContext } from 'react'

export type CartItem = { variantId: number; quantity: number }

export type CartContextValue = {
  items: CartItem[]
  count: number
  quantityOf: (variantId: number) => number
  add: (variantId: number) => void
  setQuantity: (variantId: number, quantity: number) => void
  remove: (variantId: number) => void
  clear: () => void
}

export const CartContext = createContext<CartContextValue | null>(null)

export function useCart() {
  const value = useContext(CartContext)
  if (!value) throw new Error('useCart, CartProvider içinde kullanılmalı')
  return value
}
