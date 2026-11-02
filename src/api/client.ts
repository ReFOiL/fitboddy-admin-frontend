import axios, { type InternalAxiosRequestConfig } from 'axios'

import { refresh } from './auth'
import { getStoredAccessToken, useAuthStore } from '../stores/auth.store'

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuth?: boolean
    skipAuthRedirect?: boolean
    // Повтор после refresh. Второй 401 на том же запросе больше не обновляет сессию.
    authRetry?: boolean
  }
}

const CREDENTIAL_EXCHANGE_PATHS = new Set([
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/refresh',
])

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_PLATFORM_API_URL || '',
  timeout: 12_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  if (config.skipAuth) return config
  const token = getStoredAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshInFlight: Promise<string> | null = null

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error)
    }

    const config = error.config
    if (!config || config.skipAuth || config.skipAuthRedirect || isCredentialExchange(config)) {
      return Promise.reject(error)
    }

    if (config.authRetry) {
      clearSessionAndRedirect()
      return Promise.reject(error)
    }

    try {
      const accessToken = await refreshAccessToken()
      config.authRetry = true
      config.headers.Authorization = `Bearer ${accessToken}`
    } catch {
      clearSessionAndRedirect()
      return Promise.reject(error)
    }

    return apiClient.request(config)
  },
)

function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight

  const refreshToken = useAuthStore.getState().refreshToken
  if (!refreshToken) {
    return Promise.reject(new Error('missing refresh token'))
  }

  const pending = refresh(refreshToken)
    .then((payload) => {
      const { user } = useAuthStore.getState()
      useAuthStore.getState().setSession({
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        user,
      })
      return payload.access_token
    })
    .finally(() => {
      if (refreshInFlight === pending) refreshInFlight = null
    })

  refreshInFlight = pending
  return pending
}

function clearSessionAndRedirect(): void {
  useAuthStore.getState().clearSession()
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

function isCredentialExchange(config: InternalAxiosRequestConfig): boolean {
  return CREDENTIAL_EXCHANGE_PATHS.has(pathnameOf(config))
}

function pathnameOf(config: InternalAxiosRequestConfig): string {
  const rawUrl = config.url ?? ''
  if (!rawUrl) return ''

  try {
    if (/^https?:\/\//i.test(rawUrl)) return new URL(rawUrl).pathname
    const base = config.baseURL || 'http://localhost'
    const normalizedBase = base.endsWith('/') ? base : `${base}/`
    return new URL(rawUrl, normalizedBase).pathname
  } catch {
    return rawUrl.split('?')[0] ?? ''
  }
}
