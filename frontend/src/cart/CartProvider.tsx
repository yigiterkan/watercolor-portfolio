import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CartContext, type CartContextValue, type CartItem } from './CartContext.ts'

// Sepet biçimi değiştiğinde anahtar da değişir; eski biçimdeki sepetler okunmaz.
const STORAGE_KEY = 'watercolor.cart.v2'

function loadCart(): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is CartItem =>
        Number.isInteger(item?.variantId) && Number.isInteger(item?.quantity) && item.quantity > 0,
    )
  } catch {
    return []
  }
}

function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Depolama kapalıysa sepet yalnızca sayfa açıkken tutulur.
    }
  }, [items])

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      quantityOf: (variantId) => items.find((item) => item.variantId === variantId)?.quantity ?? 0,
      add: (variantId) =>
        setItems((current) =>
          current.some((item) => item.variantId === variantId)
            ? current.map((item) =>
                item.variantId === variantId ? { ...item, quantity: item.quantity + 1 } : item,
              )
            : [...current, { variantId, quantity: 1 }],
        ),
      setQuantity: (variantId, quantity) =>
        setItems((current) =>
          quantity <= 0
            ? current.filter((item) => item.variantId !== variantId)
            : current.map((item) => (item.variantId === variantId ? { ...item, quantity } : item)),
        ),
      remove: (variantId) => setItems((current) => current.filter((item) => item.variantId !== variantId)),
      clear: () => setItems([]),
    }),
    [items],
  )

  return <CartContext value={value}>{children}</CartContext>
}

export default CartProvider
