import type { TrainerClientRelation } from '../types/relation'

export function formatRelationIdentity(params: { login?: string | null; userId: string }): string {
  return params.login?.trim() ? params.login : params.userId
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
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}
