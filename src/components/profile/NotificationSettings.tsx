import { useState } from 'react'

import { QueryState } from '../shared'
import { Button } from '../ui/button'
import { SectionLabel } from '../ui/kit'
import { notificationsEnabled } from '../../config/features'
import { useNotificationSettings } from '../../hooks/use-notification-settings'
import {
  formatLinkExpiry,
  telegramBotUsername,
  telegramStartLink,
  timezoneOptions,
} from '../../lib/notification-settings'
import { getUserErrorMessage } from '../../lib/user-error-message'
import { cn } from '../../lib/utils'

type IssuedLink = {
  url: string
  expiresAt: string
}

export function NotificationSettings() {
  const enabled = notificationsEnabled()
  const { settingsQuery, updateMutation, linkMutation, unlinkMutation } = useNotificationSettings()
  const [issued, setIssued] = useState<IssuedLink | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  const settings = settingsQuery.data
  const busy = updateMutation.isPending || linkMutation.isPending || unlinkMutation.isPending

  const connectTelegram = async () => {
    setLinkError(null)
    const username = telegramBotUsername()
    // Имя бота проверяем до запроса: неверный username не должен сжигать код.
    if (!telegramStartLink(username, 'A')) {
      setLinkError('Подключение Telegram сейчас недоступно: бот не настроен.')
      return
    }
    try {
      const issuedCode = await linkMutation.mutateAsync()
      const url = telegramStartLink(username, issuedCode.code)
      if (!url) {
        setLinkError('Не удалось открыть бота. Проверьте имя бота и попробуйте ещё раз.')
        return
      }
      setIssued({ url, expiresAt: issuedCode.expires_at })
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setLinkError(getUserErrorMessage(error, 'Не удалось получить код Telegram.'))
    }
  }

  const changeEnabled = () => {
    if (!settings) return
    updateMutation.mutate({ kind: 'enabled', notifications_enabled: !settings.notifications_enabled })
  }

  const changeTimezone = (next: string) => {
    if (!settings) return
    if (next === '' && settings.timezone_is_default) return
    if (next !== '' && next === settings.timezone && !settings.timezone_is_default) return
    updateMutation.mutate({ kind: 'timezone', timezone: next === '' ? null : next })
  }

  if (!enabled) return null

  return (
    <section className="space-y-2">
      <SectionLabel>Уведомления</SectionLabel>
      <QueryState
        isLoading={settingsQuery.isLoading}
        isError={settingsQuery.isError}
        errorTitle="Не удалось загрузить настройки уведомлений"
        onRetry={() => void settingsQuery.refetch()}
        loadingFallback={<p className="px-1 py-4 text-[15px] text-secondary-foreground">Загрузка уведомлений…</p>}
      >
        {settings ? (
          <div className="px-1">
            <div className="flex min-h-16 items-center justify-between gap-3 border-b border-border py-3">
              <div>
                <p className="text-[17px] font-semibold">Telegram</p>
                <p className="mt-0.5 text-[15px] text-secondary-foreground">
                  {settings.telegram_linked ? 'Подключён' : 'Не подключён'}
                </p>
              </div>
              {settings.telegram_linked ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    setIssued(null)
                    unlinkMutation.mutate()
                  }}
                >
                  Отключить
                </Button>
              ) : null}
            </div>

            {settings.telegram_linked ? null : (
              <div className="border-b border-border py-4">
                <Button type="button" variant="secondary" className="h-14 w-full" disabled={busy} onClick={() => void connectTelegram()}>
                  {linkMutation.isPending ? 'Получаем код…' : 'Подключить Telegram'}
                </Button>
                {linkError ? (
                  <p className="mt-3 text-[15px] text-destructive" role="alert">
                    {linkError}
                  </p>
                ) : null}
                {issued ? (
                  <div className="mt-3 space-y-2 text-[15px]">
                    <p>
                      Откройте бота и нажмите Start.
                      {formatLinkExpiry(issued.expiresAt) ? ` Код действует до ${formatLinkExpiry(issued.expiresAt)}.` : null}
                    </p>
                    <a
                      className="inline-flex h-12 items-center font-semibold underline"
                      href={issued.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Открыть Telegram
                    </a>
                    <div>
                      <button
                        type="button"
                        className="inline-flex h-12 items-center font-semibold underline"
                        onClick={() => void settingsQuery.refetch()}
                      >
                        Проверить
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-[15px] text-secondary-foreground">Пока Telegram не подключён, сообщения не приходят.</p>
                )}
              </div>
            )}

            <button
              type="button"
              role="switch"
              aria-checked={settings.notifications_enabled}
              disabled={busy}
              onClick={changeEnabled}
              className="flex min-h-16 w-full items-center justify-between gap-3 border-b border-border py-3 text-left disabled:opacity-50"
            >
              <span>
                <span className="block text-[17px] font-semibold">Уведомления</span>
                <span className="mt-0.5 block text-[15px] text-secondary-foreground">
                  {settings.notifications_enabled ? 'Включены' : 'Выключены'}
                </span>
              </span>
              <span
                aria-hidden
                className={cn(
                  'flex h-8 w-14 shrink-0 items-center rounded-full border px-1',
                  settings.notifications_enabled ? 'border-primary bg-primary' : 'border-border bg-secondary',
                )}
              >
                <span
                  className={cn(
                    'h-5 w-5 rounded-full',
                    settings.notifications_enabled ? 'ml-auto bg-primary-foreground' : 'bg-foreground',
                  )}
                />
              </span>
            </button>

            <label className="block py-4" htmlFor="notification-timezone">
              <span className="block text-[17px] font-semibold">Часовой пояс</span>
              <span className="mt-0.5 block text-[15px] text-secondary-foreground">
                По нему считаются напоминания о тренировке.
              </span>
              <select
                id="notification-timezone"
                className="mt-3 h-14 w-full rounded-2xl border border-border bg-card px-4 text-[17px]"
                value={settings.timezone_is_default ? '' : settings.timezone}
                disabled={busy}
                onChange={(event) => changeTimezone(event.target.value)}
              >
                {timezoneOptions(settings.timezone, settings.timezone_is_default).map((option) => (
                  <option key={option.value || 'default'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </QueryState>
    </section>
  )
}
