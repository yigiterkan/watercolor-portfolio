import { createContext, useContext } from 'react'
import type { LoginInput, RegisterInput } from '../api/auth.ts'
import type { User } from './types.ts'

export type AuthContextValue = {
  user: User | null
  isAdmin: boolean
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth, AuthProvider içinde kullanılmalı')
  return value
}
