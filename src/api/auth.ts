import { apiClient } from './client'
import type {
  AuthUser,
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
} from '../types/auth'

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/api/v1/auth/login', payload)
  return data
}

export async function register(payload: RegisterRequest): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>('/api/v1/auth/register', payload)
  return data
}

export async function refresh(refreshToken: string): Promise<RefreshResponse> {
  const { data } = await apiClient.post<RefreshResponse>('/api/v1/auth/refresh', {
    refresh_token: refreshToken,
  })
  return data
}

export type ClientLoginLookup = {
  user_id: string
  login: string
  role: 'client'
}

export async function lookupClientByLogin(login: string): Promise<ClientLoginLookup> {
  const { data } = await apiClient.get<ClientLoginLookup>('/api/v1/auth/clients/by-login', {
    params: { login },
  })
  return data
}

export async function me(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>('/api/v1/auth/me')
  return data
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/api/v1/auth/logout', {
    refresh_token: refreshToken,
  })
}
