import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AxiosError } from 'axios'

import { NotificationSettings } from '../src/components/profile/NotificationSettings'
import {
  notificationSettingsBody,
  telegramStartLink,
  timezoneOptions,
} from '../src/lib/notification-settings'
import { getUserErrorMessage } from '../src/lib/user-error-message'
import type { NotificationSettings as Settings } from '../src/types/notifications'

const settings: Settings = {
  timezone: 'Asia/Vladivostok',
  timezone_is_default: true,
  notifications_enabled: true,
  telegram_linked: false,
}

const mocks = vi.hoisted(() => ({
  settings: {
    timezone: 'Asia/Vladivostok',
    timezone_is_default: true,
    notifications_enabled: true,
    telegram_linked: false,
  } as Settings,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
  update: vi.fn(),
  link: vi.fn(),
  unlink: vi.fn(),
  updatePending: false,
  linkPending: false,
}))

vi.mock('../src/hooks/use-notification-settings', () => ({
  useNotificationSettings: () => ({
    settingsQuery: {
      data: mocks.isLoading || mocks.isError ? undefined : mocks.settings,
      isLoading: mocks.isLoading,
      isError: mocks.isError,
      refetch: mocks.refetch,
    },
    updateMutation: { mutate: mocks.update, isPending: mocks.updatePending },
    linkMutation: { mutateAsync: mocks.link, isPending: mocks.linkPending },
    unlinkMutation: { mutate: mocks.unlink, isPending: false },
  }),
}))

function apiError(status: number, detail: string) {
  return new AxiosError('fail', undefined, undefined, undefined, {
    status,
    data: { detail },
    statusText: 'err',
    headers: {},
    config: { headers: {} } as never,
  })
}

describe('notification settings contract', () => {
  it('собирает тело PUT только из изменённого поля', () => {
    expect(notificationSettingsBody({ kind: 'timezone', timezone: null })).toEqual({ timezone: null })
    expect(notificationSettingsBody({ kind: 'timezone', timezone: 'Europe/Moscow' })).toEqual({
      timezone: 'Europe/Moscow',
    })
    expect(notificationSettingsBody({ kind: 'enabled', notifications_enabled: false })).toEqual({
      notifications_enabled: false,
    })
  })

  it('открывает deep link бота с кодом', () => {
    expect(telegramStartLink('FitboddyBot', 'AB12CD34')).toBe('https://t.me/FitboddyBot?start=AB12CD34')
    expect(telegramStartLink('@FitboddyBot', 'AB12CD34')).toBe('https://t.me/FitboddyBot?start=AB12CD34')
    expect(telegramStartLink('', 'AB12CD34')).toBeNull()
    expect(telegramStartLink('bad name', 'AB12CD34')).toBeNull()
    expect(telegramStartLink('FitboddyBot', 'код')).toBeNull()
  })

  it('оставляет сохранённый пояс, которого нет в коротком списке', () => {
    const options = timezoneOptions('Pacific/Auckland', false)
    expect(options.some((option) => option.value === 'Pacific/Auckland')).toBe(true)
    expect(options[0]?.value).toBe('')
  })

  it('переводит ошибки настроек', () => {
    expect(getUserErrorMessage(apiError(422, 'unknown timezone'), 'Не удалось.')).toBe(
      'Такой часовой пояс не поддерживается.',
    )
    expect(getUserErrorMessage(apiError(422, 'could not allocate link code'), 'Не удалось.')).toBe(
      'Не удалось выдать код Telegram. Попробуйте ещё раз.',
    )
  })
})

describe('NotificationSettings', () => {
  beforeEach(() => {
    mocks.settings = { ...settings }
    mocks.isLoading = false
    mocks.isError = false
    mocks.updatePending = false
    mocks.linkPending = false
    mocks.update.mockReset()
    mocks.link.mockReset()
    mocks.unlink.mockReset()
    mocks.refetch.mockReset()
    vi.stubEnv('VITE_TELEGRAM_BOT_USERNAME', 'FitboddyBot')
    vi.stubGlobal('open', vi.fn())
  })

  it('показывает кнопку подключения и не запрашивает код без бота', async () => {
    vi.stubEnv('VITE_TELEGRAM_BOT_USERNAME', '')
    render(<NotificationSettings />)
    fireEvent.click(screen.getByRole('button', { name: 'Подключить Telegram' }))
    expect(mocks.link).not.toHaveBeenCalled()
    expect(await screen.findByRole('alert')).toHaveTextContent('бот не настроен')
  })

  it('запрашивает код и открывает бота', async () => {
    mocks.link.mockResolvedValue({ code: 'AB12CD34', expires_at: '2026-10-20T12:15:00Z' })
    render(<NotificationSettings />)
    fireEvent.click(screen.getByRole('button', { name: 'Подключить Telegram' }))
    await waitFor(() => expect(mocks.link).toHaveBeenCalledOnce())
    expect(window.open).toHaveBeenCalledWith('https://t.me/FitboddyBot?start=AB12CD34', '_blank', 'noopener,noreferrer')
    expect(await screen.findByRole('link', { name: 'Открыть Telegram' })).toHaveAttribute(
      'href',
      'https://t.me/FitboddyBot?start=AB12CD34',
    )
  })

  it('показывает подключённый статус и отключает чат', () => {
    mocks.settings = { ...settings, telegram_linked: true, timezone: 'Europe/Moscow', timezone_is_default: false }
    render(<NotificationSettings />)
    expect(screen.getByText('Подключён')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Подключить Telegram' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Отключить' }))
    expect(mocks.unlink).toHaveBeenCalledOnce()
  })

  it('переключает уведомления и пояс', () => {
    render(<NotificationSettings />)
    fireEvent.click(screen.getByRole('switch', { name: /Уведомления/ }))
    expect(mocks.update).toHaveBeenCalledWith({ kind: 'enabled', notifications_enabled: false })
    fireEvent.change(screen.getByLabelText(/Часовой пояс/), { target: { value: 'Europe/Moscow' } })
    expect(mocks.update).toHaveBeenCalledWith({ kind: 'timezone', timezone: 'Europe/Moscow' })
  })

  it('не ломает страницу, если настройки не загрузились', () => {
    mocks.isError = true
    render(<NotificationSettings />)
    expect(screen.getByText('Не удалось загрузить настройки уведомлений')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(mocks.refetch).toHaveBeenCalled()
  })
})
