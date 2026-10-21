import { ApiError, apiFetch } from './client.ts'

export type VariantType = 'Original' | 'Print'

export type Variant = {
  id: number
  type: VariantType
  widthCm: number
  heightCm: number
  price: number
  stock: number
}

export type Artwork = {
  id: number
  title: string
  description: string | null
  imageUrl: string | null
  createdAt: string
  variants: Variant[]
}

export type ArtworkSort = 'Newest' | 'PriceAsc' | 'PriceDesc'

export type ArtworkQuery = {
  search?: string
  type?: VariantType
  inStock?: boolean
  sort?: ArtworkSort
}

export function getArtworks(query: ArtworkQuery = {}) {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.type) params.set('type', query.type)
  if (query.inStock) params.set('inStock', 'true')
  if (query.sort && query.sort !== 'Newest') params.set('sort', query.sort)

  const qs = params.toString()
  return apiFetch<Artwork[]>(qs ? `/api/artworks?${qs}` : '/api/artworks')
}

export async function getArtwork(id: number): Promise<Artwork | null> {
  try {
    return await apiFetch<Artwork>(`/api/artworks/${id}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export type ArtworkInput = {
  title: string
  description: string | null
}

export type VariantInput = Omit<Variant, 'id'>

export function createArtwork(input: ArtworkInput) {
  return apiFetch<Artwork>('/api/artworks', { method: 'POST', body: input })
}

export function updateArtwork(id: number, input: ArtworkInput) {
  return apiFetch<void>(`/api/artworks/${id}`, { method: 'PUT', body: input })
}

export function deleteArtwork(id: number) {
  return apiFetch<void>(`/api/artworks/${id}`, { method: 'DELETE' })
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function uploadArtworkImage(id: number, file: File) {
  const form = new FormData()
  form.append('file', file)
  return apiFetch<Artwork>(`/api/artworks/${id}/image`, { method: 'POST', body: form })
}

export function deleteArtworkImage(id: number) {
  return apiFetch<void>(`/api/artworks/${id}/image`, { method: 'DELETE' })
}

export function createVariant(artworkId: number, input: VariantInput) {
  return apiFetch<Variant>(`/api/artworks/${artworkId}/variants`, { method: 'POST', body: input })
}

export function updateVariant(artworkId: number, variantId: number, input: VariantInput) {
  return apiFetch<Variant>(`/api/artworks/${artworkId}/variants/${variantId}`, { method: 'PUT', body: input })
}

export function deleteVariant(artworkId: number, variantId: number) {
  return apiFetch<void>(`/api/artworks/${artworkId}/variants/${variantId}`, { method: 'DELETE' })
}
