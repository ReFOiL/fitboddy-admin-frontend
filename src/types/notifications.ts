export type NotificationSettings = {
  timezone: string
  timezone_is_default: boolean
  notifications_enabled: boolean
  telegram_linked: boolean
}

// null в timezone сбрасывает пояс на серверный по умолчанию.
// Поле, которого нет в теле, сервер не меняет.
export type UpdateNotificationSettingsRequest = {
  timezone?: string | null
  notifications_enabled?: boolean
}

export type TelegramLinkCode = {
  code: string
  expires_at: string
}

export type NotificationSettingsPatch =
  | { kind: 'timezone'; timezone: string | null }
  | { kind: 'enabled'; notifications_enabled: boolean }
