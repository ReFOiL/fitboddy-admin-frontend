export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRole = 'trainer' | 'client'

export type RegisterRequest = {
  role: RegisterRole
  email: string
  password: string
}

export type TokenPair = {
  access_token: string
  refresh_token: string
  token_type: string
}

export type AuthUser = {
  user_id: string
  tenant_id: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

export type LoginResponse = {
  user: AuthUser
  tokens: TokenPair
}

export type RegisterResponse = LoginResponse

export type RefreshResponse = TokenPair
