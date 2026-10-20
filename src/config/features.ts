// Уведомления и привязка Telegram отложены: Telegram в РФ недоступен,
// позже перейдём на мессенджер MAX. Пока флаг выключен, блок в профиле скрыт
// и клиент не вызывает /api/v1/plans/me/notifications (этих ручек нет без plan-service #6).
// Включить сборкой: VITE_NOTIFICATIONS_ENABLED=true (или 1).

export function notificationsEnabled(
  value: unknown = import.meta.env.VITE_NOTIFICATIONS_ENABLED,
): boolean {
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  return normalized === 'true' || normalized === '1'
}
