import type { AuthSession } from '../auth/types.ts'
import { apiFetch } from './client.ts'

export type LoginInput = { email: string; password: string }
export type RegisterInput = { fullName: string; email: string; password: string }

export function login(input: LoginInput) {
  return apiFetch<AuthSession>('/api/auth/login', { method: 'POST', body: input })
}

export function register(input: RegisterInput) {
  return apiFetch<AuthSession>('/api/auth/register', { method: 'POST', body: input })
}
