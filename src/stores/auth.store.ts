import { create } from 'zustand'

import type { AuthUser } from '../types/auth'

const ACCESS_TOKEN_KEY = 'platform_access_token'
const REFRESH_TOKEN_KEY = 'platform_refresh_token'

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  setSession: (params: { accessToken: string; refreshToken: string; user: AuthUser | null }) => void
  clearSession: () => void
  setUser: (user: AuthUser | null) => void
}

function readAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

function readRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

function writeTokens(accessToken: string | null, refreshToken: string | null): void {
  if (!accessToken || !refreshToken) {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    return
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function getStoredAccessToken(): string | null {
  return readAccessToken()
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: readAccessToken(),
  refreshToken: readRefreshToken(),
  user: null,
  setSession: ({ accessToken, refreshToken, user }) => {
    writeTokens(accessToken, refreshToken)
    set({ accessToken, refreshToken, user })
  },
  clearSession: () => {
    writeTokens(null, null)
    set({ accessToken: null, refreshToken: null, user: null })
  },
  setUser: (user) => set({ user }),
}))
