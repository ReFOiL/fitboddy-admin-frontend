import { formatCalendarDate } from './dates'
import type { TrainerClientRelation } from '../types/relation'

/** Имя для человека. Сырой идентификатор на экран не выводим. */
export function formatRelationIdentity(params: {
  name?: string | null
  login?: string | null
  fallback: string
}): string {
  return params.name?.trim() || params.login?.trim() || params.fallback
}

export function formatTrainerClientCardTitle(relation: TrainerClientRelation): string {
  return relation.client_display_name?.trim() || relation.client_login?.trim() || 'Клиент'
}

export function formatTrainerClientCardSubtitle(relation: TrainerClientRelation): string | null {
  const displayName = relation.client_display_name?.trim()
  const login = relation.client_login?.trim()
  if (!displayName || !login) return null
  if (displayName.toLowerCase() === login.toLowerCase()) return null
  return `@${login}`
}

export function formatRussianDate(value: string, fallback = 'Дата неизвестна'): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return `${formatCalendarDate(date, 'long')} ${date.getFullYear()}`
}
