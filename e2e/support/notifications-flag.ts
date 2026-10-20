import { notificationsEnabled } from '../../src/config/features'

// Пустая строка не включает флаг. Так мы не читаем import.meta.env вне Vite.
export function notificationsE2eEnabled(): boolean {
  return notificationsEnabled(process.env.VITE_NOTIFICATIONS_ENABLED ?? '')
}

export function e2eDevServerCommand(): string {
  // Имя бота нужно только когда флаг включён: без него ссылка на Telegram не строится.
  const flag = notificationsE2eEnabled() ? 'VITE_NOTIFICATIONS_ENABLED=true ' : ''
  return `${flag}VITE_TELEGRAM_BOT_USERNAME=fitboddy_bot npm run dev -- --host 127.0.0.1 --port 4173 --strictPort`
}
