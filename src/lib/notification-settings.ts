import type { NotificationSettingsPatch, UpdateNotificationSettingsRequest } from '../types/notifications'

export const NOTIFICATION_TIMEZONES = [
  { id: 'Europe/Kaliningrad', city: 'Калининград' },
  { id: 'Europe/Moscow', city: 'Москва' },
  { id: 'Europe/Samara', city: 'Самара' },
  { id: 'Asia/Yekaterinburg', city: 'Екатеринбург' },
  { id: 'Asia/Omsk', city: 'Омск' },
  { id: 'Asia/Krasnoyarsk', city: 'Красноярск' },
  { id: 'Asia/Irkutsk', city: 'Иркутск' },
  { id: 'Asia/Yakutsk', city: 'Якутск' },
  { id: 'Asia/Vladivostok', city: 'Владивосток' },
  { id: 'Asia/Magadan', city: 'Магадан' },
  { id: 'Asia/Kamchatka', city: 'Камчатка' },
] as const

export type TimezoneOption = { value: string; label: string }

export function telegramBotUsername(value: unknown = import.meta.env.VITE_TELEGRAM_BOT_USERNAME): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/^@/, '')
}

// start принимает латиницу, цифры, _ и -. Код с сервера — 8 символов из этого набора.
export function telegramStartLink(username: string, code: string): string | null {
  const bot = username.trim().replace(/^@/, '')
  const start = code.trim()
  if (!/^[A-Za-z0-9_]{5,32}$/.test(bot)) return null
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(start)) return null
  return `https://t.me/${bot}?start=${start}`
}

export function notificationSettingsBody(patch: NotificationSettingsPatch): UpdateNotificationSettingsRequest {
  switch (patch.kind) {
    case 'timezone':
      return { timezone: patch.timezone }
    case 'enabled':
      return { notifications_enabled: patch.notifications_enabled }
    default: {
      const unreachable: never = patch
      return unreachable
    }
  }
}

export function timezoneCity(timezone: string): string {
  return NOTIFICATION_TIMEZONES.find((item) => item.id === timezone)?.city ?? timezone
}

export function timezoneOptions(timezone: string, isDefault: boolean): TimezoneOption[] {
  const options: TimezoneOption[] = [
    {
      value: '',
      label: isDefault ? `По умолчанию · ${timezoneCity(timezone)}` : 'Пояс по умолчанию',
    },
    ...NOTIFICATION_TIMEZONES.map((item) => ({ value: item.id, label: item.city })),
  ]
  if (!isDefault && timezone && !NOTIFICATION_TIMEZONES.some((item) => item.id === timezone)) {
    options.push({ value: timezone, label: timezone })
  }
  return options
}

export function formatLinkExpiry(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
