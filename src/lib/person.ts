export function personInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export function firstName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ''
  return trimmed.split(/\s+/)[0] ?? trimmed
}

export function clientDisplayName(relation: {
  client_display_name?: string | null
  client_login?: string | null
}): string {
  const display = relation.client_display_name?.trim()
  if (display) return display
  const login = relation.client_login?.trim()
  if (login) return login
  return 'Клиент'
}
