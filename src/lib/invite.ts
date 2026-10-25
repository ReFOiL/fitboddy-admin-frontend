import axios from 'axios'

import { APP_PATHS } from '../config'
import { getUserErrorMessage } from './user-error-message'
import type { PublicInvite } from '../types/relation'

// Без 0/O, 1/I и L — так же, как выдаёт tenant-service. Регистр на сервере не важен.
const INVITE_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const INVITE_CODE_PATTERN = new RegExp(`^[${INVITE_CODE_ALPHABET}]{6}$`)

export const PENDING_INVITE_CODE_KEY = 'fitboddy:pending-invite-code'

export type InviteAcceptFailure =
  | { kind: 'already_linked'; currentTrainerUserId: string | null }
  | { kind: 'forbidden' }
  | { kind: 'not_found' }
  | { kind: 'other'; message: string }

export function normalizeInviteCode(value: string | null | undefined): string | null {
  if (!value) return null
  const code = value.trim().toUpperCase()
  return INVITE_CODE_PATTERN.test(code) ? code : null
}

export function savePendingInviteCode(code: string): void {
  const normalized = normalizeInviteCode(code)
  if (!normalized) return
  sessionStorage.setItem(PENDING_INVITE_CODE_KEY, normalized)
}

export function readPendingInviteCode(): string | null {
  try {
    return normalizeInviteCode(sessionStorage.getItem(PENDING_INVITE_CODE_KEY))
  } catch {
    return null
  }
}

export function clearPendingInviteCode(): void {
  sessionStorage.removeItem(PENDING_INVITE_CODE_KEY)
}

export function inviteLandingPath(code: string): string {
  return `/i/${encodeURIComponent(code)}`
}

export function absoluteInviteUrl(invitePath: string, origin = window.location.origin): string {
  const path = invitePath.startsWith('/') ? invitePath : `/${invitePath}`
  return `${origin}${path}`
}

export function loginPath(tab: 'login' | 'register'): string {
  return tab === 'register' ? `${APP_PATHS.login}?tab=register` : APP_PATHS.login
}

// После регистрации клиент сначала заполняет анкету. Код в sessionStorage дожидается её конца.
export function pathAfterAuth(role: string | undefined, fallback: string): string {
  const code = readPendingInviteCode()
  if (!code) return fallback
  if (role === 'client' && fallback === APP_PATHS.profileOnboarding) return fallback
  return inviteLandingPath(code)
}

export function trainerInviteName(invite: Pick<PublicInvite, 'trainer_display_name' | 'trainer_login'>): string | null {
  return invite.trainer_display_name?.trim() || invite.trainer_login?.trim() || null
}

export function trainerInviteTitle(invite: Pick<PublicInvite, 'trainer_display_name' | 'trainer_login'>): string {
  const name = trainerInviteName(invite)
  return name ? `Тренер ${name} приглашает вас` : 'Тренер приглашает вас'
}

export function classifyInviteAcceptError(error: unknown): InviteAcceptFailure {
  if (!axios.isAxiosError(error)) {
    return { kind: 'other', message: 'Не удалось принять приглашение.' }
  }

  const status = error.response?.status
  const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail

  if (status === 409 && isAlreadyLinkedDetail(detail)) {
    const current = detail.current_trainer_user_id
    return {
      kind: 'already_linked',
      currentTrainerUserId: typeof current === 'string' ? current : null,
    }
  }
  if (status === 403) return { kind: 'forbidden' }
  if (status === 404) return { kind: 'not_found' }
  return { kind: 'other', message: getUserErrorMessage(error, 'Не удалось принять приглашение.') }
}

function isAlreadyLinkedDetail(detail: unknown): detail is { reason: string; current_trainer_user_id?: unknown } {
  return Boolean(
    detail &&
      typeof detail === 'object' &&
      'reason' in detail &&
      (detail as { reason?: unknown }).reason === 'already_linked',
  )
}
