import type { Artwork, Variant, VariantType } from '../api/artworks.ts'
import { formatPrice } from './format.ts'

export const VARIANT_TYPE_LABELS: Record<VariantType, string> = {
  Original: 'Orijinal',
  Print: 'Baskı',
}

export function variantLabel(type: VariantType, widthCm: number, heightCm: number) {
  return `${VARIANT_TYPE_LABELS[type]} · ${widthCm} × ${heightCm} cm`
}

// Backend'in sıralamasıyla aynı: önce orijinal, sonra fiyat.
export function sortVariants(variants: Variant[]) {
  return [...variants].sort(
    (a, b) => Number(a.type !== 'Original') - Number(b.type !== 'Original') || a.price - b.price,
  )
}

export function isSoldOut(artwork: Artwork) {
  return artwork.variants.length > 0 && artwork.variants.every((variant) => variant.stock === 0)
}

export function priceSummary(artwork: Artwork) {
  if (artwork.variants.length === 0) return null

  const inStock = artwork.variants.filter((variant) => variant.stock > 0)
  const prices = (inStock.length > 0 ? inStock : artwork.variants).map((variant) => variant.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)

  return min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`
}
