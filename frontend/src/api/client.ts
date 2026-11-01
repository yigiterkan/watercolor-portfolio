import { loadSession } from '../auth/storage.ts'

export type PagedResult<T> = {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}

export class ApiError extends Error {
  status: number
  errors: Record<string, string[]>

  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
}

export async function apiFetch<T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
  const token = loadSession()?.token
  const headers: Record<string, string> = {}
  // FormData (dosya yükleme) için Content-Type'ı tarayıcı kendisi ayarlar.
  const isForm = body instanceof FormData
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  })

  if (!res.ok) {
    if (res.status === 401 && token) unauthorizedHandler?.()

    const problem = await res.json().catch(() => null)
    throw new ApiError(res.status, problem?.title ?? `İstek başarısız (${res.status})`, problem?.errors)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}
