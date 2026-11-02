import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { login, refresh, register } from '../src/api/auth'
import { apiClient } from '../src/api/client'
import { useAuthStore } from '../src/stores/auth.store'
import type { AuthUser } from '../src/types/auth'

const user: AuthUser = {
  user_id: 'user-1',
  tenant_id: 'tenant-1',
  login: 'ada',
  email: 'ada@example.com',
  role: 'trainer',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

type ProtectedMode = 'expired' | 'always-401' | 'retry-500' | 'server-error'

type RecordedCall = {
  path: string
  method: string
  authorization?: string
  data: unknown
}

const calls: RecordedCall[] = []
const mode: { refreshStatus: number; protected: ProtectedMode } = {
  refreshStatus: 200,
  protected: 'expired',
}

let protectedAttempts = 0
let loginRedirects = 0
let restoreRedirectTracking: (() => void) | undefined

type JsdomEmitter = {
  listeners(event: string): Array<(error: Error) => void>
  removeAllListeners(event: string): void
  on(event: string, listener: (error: Error) => void): void
  removeListener(event: string, listener: (error: Error) => void): void
}

function trackLoginRedirects(): () => void {
  // jsdom не выполняет переход на другой документ и сообщает об этом через virtualConsole.
  const emitter = (window as unknown as { _virtualConsole?: JsdomEmitter })._virtualConsole
  if (!emitter) return () => {}

  const previous = emitter.listeners('jsdomError')
  emitter.removeAllListeners('jsdomError')
  const onJsdomError = (error: Error) => {
    if (error?.message?.includes('navigation to another Document')) {
      loginRedirects += 1
      return
    }
    for (const listener of previous) listener.call(emitter, error)
  }
  emitter.on('jsdomError', onJsdomError)

  return () => {
    emitter.removeListener('jsdomError', onJsdomError)
    for (const listener of previous) emitter.on('jsdomError', listener)
  }
}

const originalAdapter = apiClient.defaults.adapter

function signIn(): void {
  useAuthStore.getState().setSession({
    accessToken: 'stale-access',
    refreshToken: 'valid-refresh',
    user,
  })
}

function callsTo(path: string): RecordedCall[] {
  return calls.filter((call) => call.path === path)
}

function parseBody(data: unknown): unknown {
  if (typeof data !== 'string') return data
  try {
    return JSON.parse(data) as unknown
  } catch {
    return data
  }
}

function pathOf(config: InternalAxiosRequestConfig): string {
  const raw = config.url ?? ''
  try {
    return new URL(raw, 'http://localhost').pathname
  } catch {
    return raw.split('?')[0] ?? ''
  }
}

function authorizationOf(config: InternalAxiosRequestConfig): string | undefined {
  const value = config.headers.get('Authorization')
  return typeof value === 'string' ? value : undefined
}

function responseFor(config: InternalAxiosRequestConfig, status: number, data: unknown): AxiosResponse {
  return {
    data,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    headers: {},
    config,
  }
}

function settle(config: InternalAxiosRequestConfig, status: number, data: unknown): Promise<AxiosResponse> {
  const response = responseFor(config, status, data)
  if (status >= 200 && status < 300) return Promise.resolve(response)
  const code = status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST
  return Promise.reject(new AxiosError(`Request failed with status code ${status}`, code, config, undefined, response))
}

function protectedStatus(authorization: string | undefined, attempt: number): number {
  if (mode.protected === 'server-error') return 500
  if (mode.protected === 'always-401') return 401
  if (mode.protected === 'retry-500') return attempt === 1 ? 401 : 500
  return authorization === 'Bearer access-new' ? 200 : 401
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

beforeEach(() => {
  calls.length = 0
  protectedAttempts = 0
  loginRedirects = 0
  mode.refreshStatus = 200
  mode.protected = 'expired'
  localStorage.clear()
  useAuthStore.getState().clearSession()
  window.history.pushState({}, '', '/dashboard')
  restoreRedirectTracking = trackLoginRedirects()
  apiClient.defaults.adapter = async (config) => {
    const path = pathOf(config)
    calls.push({
      path,
      method: config.method ?? '',
      authorization: authorizationOf(config),
      data: config.data,
    })

    if (path === '/api/v1/auth/refresh') {
      if (callsTo(path).length > 4) return settle(config, 500, { detail: 'refresh storm' })
      await pause(20)
      if (mode.refreshStatus >= 400) return settle(config, mode.refreshStatus, { detail: 'invalid refresh' })
      return settle(config, 200, {
        access_token: 'access-new',
        refresh_token: 'refresh-new',
        token_type: 'bearer',
      })
    }

    if (path === '/api/v1/auth/login' || path === '/api/v1/auth/register') {
      return settle(config, 401, { detail: 'invalid credentials' })
    }

    protectedAttempts += 1
    const status = protectedStatus(authorizationOf(config), protectedAttempts)
    if (status >= 400) return settle(config, status, { detail: 'unauthorized' })
    return settle(config, 200, { ok: true })
  }
})

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  restoreRedirectTracking?.()
  restoreRedirectTracking = undefined
  window.history.pushState({}, '', '/')
  localStorage.clear()
  useAuthStore.getState().clearSession()
})

describe('api client 401 refresh', () => {
  it('обновляет сессию и один раз повторяет запрос, не уводя на логин', async () => {
    signIn()

    const response = await apiClient.post('/api/v1/plans', { note: 'hi' })

    expect(response.data).toEqual({ ok: true })
    expect(callsTo('/api/v1/auth/refresh')).toHaveLength(1)
    expect(callsTo('/api/v1/auth/refresh')[0]?.authorization).toBeUndefined()
    expect(parseBody(callsTo('/api/v1/auth/refresh')[0]?.data)).toEqual({ refresh_token: 'valid-refresh' })
    expect(callsTo('/api/v1/plans').map((call) => call.authorization)).toEqual([
      'Bearer stale-access',
      'Bearer access-new',
    ])
    expect(callsTo('/api/v1/plans').map((call) => parseBody(call.data))).toEqual([{ note: 'hi' }, { note: 'hi' }])
    expect(useAuthStore.getState().accessToken).toBe('access-new')
    expect(useAuthStore.getState().refreshToken).toBe('refresh-new')
    expect(useAuthStore.getState().user).toEqual(user)
    expect(localStorage.getItem('platform_access_token')).toBe('access-new')
    expect(localStorage.getItem('platform_refresh_token')).toBe('refresh-new')
    expect(loginRedirects).toBe(0)
    expect(window.location.pathname).toBe('/dashboard')
  })

  it('разлогинивает, если refresh ответил ошибкой', async () => {
    signIn()
    mode.refreshStatus = 401

    await expect(apiClient.get('/api/v1/profile')).rejects.toMatchObject({ response: { status: 401 } })

    expect(callsTo('/api/v1/auth/refresh')).toHaveLength(1)
    expect(callsTo('/api/v1/profile')).toHaveLength(1)
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().refreshToken).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
    expect(localStorage.getItem('platform_access_token')).toBeNull()
    expect(localStorage.getItem('platform_refresh_token')).toBeNull()
    expect(loginRedirects).toBe(1)
  })

  it('разлогинивает без запроса refresh, если refresh-токена нет', async () => {
    localStorage.setItem('platform_access_token', 'stale-access')
    useAuthStore.setState({ accessToken: 'stale-access', refreshToken: null, user })

    await expect(apiClient.get('/api/v1/profile')).rejects.toMatchObject({ response: { status: 401 } })

    expect(callsTo('/api/v1/auth/refresh')).toHaveLength(0)
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(localStorage.getItem('platform_access_token')).toBeNull()
    expect(loginRedirects).toBe(1)
  })

  it('на странице логина очищает сессию и не перезагружает её', async () => {
    window.history.pushState({}, '', '/login')
    localStorage.setItem('platform_access_token', 'stale-access')
    useAuthStore.setState({ accessToken: 'stale-access', refreshToken: null, user })

    await expect(apiClient.get('/api/v1/profile')).rejects.toMatchObject({ response: { status: 401 } })

    expect(window.location.pathname).toBe('/login')
    expect(loginRedirects).toBe(0)
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('делит один refresh между одновременными 401', async () => {
    signIn()

    const responses = await Promise.all([
      apiClient.get('/api/v1/profile'),
      apiClient.get('/api/v1/plans'),
      apiClient.get('/api/v1/notifications'),
    ])

    expect(responses.map((response) => response.status)).toEqual([200, 200, 200])
    expect(callsTo('/api/v1/auth/refresh')).toHaveLength(1)
    expect(callsTo('/api/v1/profile').map((call) => call.authorization)).toEqual([
      'Bearer stale-access',
      'Bearer access-new',
    ])
    expect(callsTo('/api/v1/plans').map((call) => call.authorization)).toEqual([
      'Bearer stale-access',
      'Bearer access-new',
    ])
    expect(callsTo('/api/v1/notifications').map((call) => call.authorization)).toEqual([
      'Bearer stale-access',
      'Bearer access-new',
    ])
    expect(loginRedirects).toBe(0)
    expect(useAuthStore.getState().refreshToken).toBe('refresh-new')
  })

  it('одновременные 401 при мёртвом refresh делают один запрос и разлогинивают', async () => {
    signIn()
    mode.refreshStatus = 500

    const results = await Promise.allSettled([apiClient.get('/api/v1/profile'), apiClient.get('/api/v1/plans')])

    expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected'])
    expect(callsTo('/api/v1/auth/refresh')).toHaveLength(1)
    expect(callsTo('/api/v1/profile')).toHaveLength(1)
    expect(callsTo('/api/v1/plans')).toHaveLength(1)
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(loginRedirects).toBe(2)
  })

  it('повторный 401 после refresh не запускает refresh снова', async () => {
    signIn()
    mode.protected = 'always-401'

    await expect(apiClient.get('/api/v1/profile')).rejects.toMatchObject({ response: { status: 401 } })

    expect(callsTo('/api/v1/auth/refresh')).toHaveLength(1)
    expect(callsTo('/api/v1/profile')).toHaveLength(2)
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(loginRedirects).toBe(1)
  })

  it('не разлогинивает, если повтор после refresh упал не с 401', async () => {
    signIn()
    mode.protected = 'retry-500'

    await expect(apiClient.get('/api/v1/me')).rejects.toMatchObject({ response: { status: 500 } })

    expect(callsTo('/api/v1/auth/refresh')).toHaveLength(1)
    expect(useAuthStore.getState().accessToken).toBe('access-new')
    expect(useAuthStore.getState().user).toEqual(user)
    expect(loginRedirects).toBe(0)
  })

  it('не трогает сессию на обычной ошибке', async () => {
    signIn()
    mode.protected = 'server-error'

    await expect(apiClient.get('/api/v1/profile')).rejects.toMatchObject({ response: { status: 500 } })

    expect(callsTo('/api/v1/auth/refresh')).toHaveLength(0)
    expect(useAuthStore.getState().accessToken).toBe('stale-access')
    expect(loginRedirects).toBe(0)
  })

  it('не обновляет сессию на 401 логина, регистрации и refresh', async () => {
    signIn()

    await expect(apiClient.post('/api/v1/auth/login?next=/home', { email_or_login: 'ada', password: 'secret12' })).rejects.toMatchObject({
      response: { status: 401 },
    })
    await expect(
      apiClient.post('/api/v1/auth/register', {
        role: 'client',
        login: 'ada',
        email: 'ada@example.com',
        password: 'secret12',
      }),
    ).rejects.toMatchObject({ response: { status: 401 } })
    mode.refreshStatus = 401
    await expect(apiClient.post('/api/v1/auth/refresh', { refresh_token: 'valid-refresh' })).rejects.toMatchObject({
      response: { status: 401 },
    })

    expect(callsTo('/api/v1/auth/refresh')).toHaveLength(1)
    expect(useAuthStore.getState().accessToken).toBe('stale-access')
    expect(useAuthStore.getState().user).toEqual(user)
    expect(loginRedirects).toBe(0)
  })

  it('login, register и refresh не отправляют access token', async () => {
    signIn()

    await expect(login({ email_or_login: 'ada', password: 'secret12' })).rejects.toMatchObject({
      response: { status: 401 },
    })
    await expect(
      register({
        role: 'client',
        login: 'ada',
        email: 'ada@example.com',
        password: 'secret12',
      }),
    ).rejects.toMatchObject({ response: { status: 401 } })
    await expect(refresh('valid-refresh')).resolves.toMatchObject({
      access_token: 'access-new',
      refresh_token: 'refresh-new',
    })

    expect(calls.map((call) => call.authorization)).toEqual([undefined, undefined, undefined])
    expect(useAuthStore.getState().accessToken).toBe('stale-access')
    expect(loginRedirects).toBe(0)
  })

  it('не трогает сессию, если запрос помечен skipAuth или skipAuthRedirect', async () => {
    signIn()

    await expect(apiClient.get('/api/v1/marketplace/invite/code', { skipAuth: true })).rejects.toMatchObject({
      response: { status: 401 },
    })
    await expect(apiClient.get('/api/v1/profile', { skipAuthRedirect: true })).rejects.toMatchObject({
      response: { status: 401 },
    })

    expect(callsTo('/api/v1/auth/refresh')).toHaveLength(0)
    expect(calls[0]?.authorization).toBeUndefined()
    expect(calls[1]?.authorization).toBe('Bearer stale-access')
    expect(useAuthStore.getState().accessToken).toBe('stale-access')
    expect(loginRedirects).toBe(0)
  })
})
