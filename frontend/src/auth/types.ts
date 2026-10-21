export type Role = 'User' | 'Admin'

export type User = {
  id: string
  email: string
  fullName: string
  roles: Role[]
}

export type AuthSession = {
  token: string
  expiresAt: string
  user: User
}
