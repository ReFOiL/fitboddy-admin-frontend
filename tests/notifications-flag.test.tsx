import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { useState, type ReactNode } from 'react'

import { apiClient } from '../src/api/client'
import {
  getNotificationSettings,
  issueTelegramLinkCode,
  unlinkTelegram,
  updateNotificationSettings,
} from '../src/api/notifications'
import { notificationsEnabled } from '../src/config/features'
import { useNotificationSettings } from '../src/hooks/use-notification-settings'

const settingsPayload = {
  timezone: 'Europe/Moscow',
  timezone_is_default: true,
  notifications_enabled: true,
  telegram_linked: false,
}

function Wrapper({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('notificationsEnabled', () => {
  it('по умолчанию выключен и не принимает произвольные строки', () => {
    expect(notificationsEnabled(undefined)).toBe(false)
    expect(notificationsEnabled('')).toBe(false)
    expect(notificationsEnabled('false')).toBe(false)
    expect(notificationsEnabled('0')).toBe(false)
    expect(notificationsEnabled('yes')).toBe(false)
  })

  it('включается строками true и 1', () => {
    expect(notificationsEnabled('true')).toBe(true)
    expect(notificationsEnabled(' TRUE ')).toBe(true)
    expect(notificationsEnabled('1')).toBe(true)
  })

  it('читает выключенное окружение сборки', () => {
    vi.stubEnv('VITE_NOTIFICATIONS_ENABLED', '')
    expect(notificationsEnabled()).toBe(false)
    vi.unstubAllEnvs()
  })
})

describe('ручки уведомлений', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('не вызывают сеть, пока флаг выключен', async () => {
    vi.stubEnv('VITE_NOTIFICATIONS_ENABLED', '')
    const get = vi.spyOn(apiClient, 'get')
    const put = vi.spyOn(apiClient, 'put')
    const post = vi.spyOn(apiClient, 'post')
    const del = vi.spyOn(apiClient, 'delete')

    await expect(getNotificationSettings()).rejects.toThrow('notifications are disabled')
    await expect(updateNotificationSettings({ notifications_enabled: false })).rejects.toThrow(
      'notifications are disabled',
    )
    await expect(issueTelegramLinkCode()).rejects.toThrow('notifications are disabled')
    await expect(unlinkTelegram()).rejects.toThrow('notifications are disabled')

    expect(get).not.toHaveBeenCalled()
    expect(put).not.toHaveBeenCalled()
    expect(post).not.toHaveBeenCalled()
    expect(del).not.toHaveBeenCalled()
  })

  it('с флагом снова ходят в настройки и Telegram', async () => {
    vi.stubEnv('VITE_NOTIFICATIONS_ENABLED', 'true')
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: settingsPayload })
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({
      data: { ...settingsPayload, notifications_enabled: false },
    })
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { code: 'AB12CD34', expires_at: '2026-10-20T12:00:00Z' },
    })
    const del = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: {} })

    await expect(getNotificationSettings()).resolves.toEqual(settingsPayload)
    await updateNotificationSettings({ notifications_enabled: false })
    await issueTelegramLinkCode()
    await unlinkTelegram()

    expect(get).toHaveBeenCalledWith('/api/v1/plans/me/notifications/settings')
    expect(put).toHaveBeenCalledWith('/api/v1/plans/me/notifications/settings', {
      notifications_enabled: false,
    })
    expect(post).toHaveBeenCalledWith('/api/v1/plans/me/notifications/telegram/link-code')
    expect(del).toHaveBeenCalledWith('/api/v1/plans/me/notifications/telegram')
  })
})

describe('useNotificationSettings', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('не запрашивает настройки, пока флаг выключен', async () => {
    vi.stubEnv('VITE_NOTIFICATIONS_ENABLED', 'false')
    const get = vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('should not be called'))
    const { result } = renderHook(() => useNotificationSettings(), { wrapper: Wrapper })

    expect(result.current.settingsQuery.fetchStatus).toBe('idle')
    await waitFor(() => expect(result.current.settingsQuery.isFetched).toBe(false))
    expect(get).not.toHaveBeenCalled()
  })

  it('с флагом загружает настройки', async () => {
    vi.stubEnv('VITE_NOTIFICATIONS_ENABLED', '1')
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: settingsPayload })
    const { result } = renderHook(() => useNotificationSettings(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.settingsQuery.data).toEqual(settingsPayload))
  })
})
