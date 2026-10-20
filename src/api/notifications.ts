import { apiClient } from './client'
import type {
  NotificationSettings,
  TelegramLinkCode,
  UpdateNotificationSettingsRequest,
} from '../types/notifications'

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const { data } = await apiClient.get<unknown>('/api/v1/plans/me/notifications/settings')
  if (!isNotificationSettings(data)) {
    throw new Error('notification settings payload is invalid')
  }
  return data
}

export async function updateNotificationSettings(
  payload: UpdateNotificationSettingsRequest,
): Promise<NotificationSettings> {
  const { data } = await apiClient.put<unknown>('/api/v1/plans/me/notifications/settings', payload)
  if (!isNotificationSettings(data)) {
    throw new Error('notification settings payload is invalid')
  }
  return data
}

export async function issueTelegramLinkCode(): Promise<TelegramLinkCode> {
  const { data } = await apiClient.post<unknown>('/api/v1/plans/me/notifications/telegram/link-code')
  if (!isTelegramLinkCode(data)) {
    throw new Error('telegram link code payload is invalid')
  }
  return data
}

export async function unlinkTelegram(): Promise<void> {
  await apiClient.delete('/api/v1/plans/me/notifications/telegram')
}

function isNotificationSettings(value: unknown): value is NotificationSettings {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return (
    typeof row.timezone === 'string' &&
    typeof row.timezone_is_default === 'boolean' &&
    typeof row.notifications_enabled === 'boolean' &&
    typeof row.telegram_linked === 'boolean'
  )
}

function isTelegramLinkCode(value: unknown): value is TelegramLinkCode {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return typeof row.code === 'string' && row.code.trim().length > 0 && typeof row.expires_at === 'string'
}
