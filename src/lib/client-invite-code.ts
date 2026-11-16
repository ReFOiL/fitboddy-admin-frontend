import { normalizeInviteCode } from './invite'

/** Код из 6 символов или ссылка `/i/CODE`, в том числе полный URL. */
export function parseClientInviteInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const fromLink = /\/i\/([^/?#\s]+)/i.exec(trimmed)
  if (fromLink) return normalizeInviteCode(decodeURIComponent(fromLink[1]))
  return normalizeInviteCode(trimmed)
}
