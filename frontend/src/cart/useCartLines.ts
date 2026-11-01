import { useEffect, useMemo, useState } from 'react'
import { getArtworks, type Artwork, type Variant } from '../api/artworks.ts'
import { useCart } from './CartContext.ts'

export type CartLine = { artwork: Artwork; variant: Variant; quantity: number }

export function useCartLines() {
  const { items, remove } = useCart()
  // Yalnızca açılıştaki sepet içeriği sorgulanır; sonradan yalnızca adet değişir ya da kalem silinir.
  const [initialIds] = useState(() => items.map((item) => item.variantId))
  const [artworks, setArtworks] = useState<Artwork[] | null>(initialIds.length === 0 ? [] : null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (initialIds.length === 0) return
    getArtworks({ variantIds: initialIds, pageSize: 100 })
      .then((result) => setArtworks(result.items))
      .catch(() => setError(true))
  }, [initialIds])

  const variantsById = useMemo(() => {
    const map = new Map<number, { artwork: Artwork; variant: Variant }>()
    for (const artwork of artworks ?? []) {
      for (const variant of artwork.variants) map.set(variant.id, { artwork, variant })
    }
    return map
  }, [artworks])

  useEffect(() => {
    if (!artworks) return
    for (const item of items) {
      if (!variantsById.has(item.variantId)) remove(item.variantId)
    }
  }, [artworks, items, variantsById, remove])

  const lines = useMemo<CartLine[]>(
    () =>
      items.flatMap((item) => {
        const match = variantsById.get(item.variantId)
        return match ? [{ ...match, quantity: item.quantity }] : []
      }),
    [items, variantsById],
  )

  return {
    lines,
    total: lines.reduce((sum, line) => sum + line.variant.price * line.quantity, 0),
    hasStockProblem: lines.some((line) => line.quantity > line.variant.stock),
    loading: !artworks && !error,
    error,
  }
}
