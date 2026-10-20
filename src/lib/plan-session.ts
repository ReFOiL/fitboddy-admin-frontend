/** Local checklist progress for a workout day (not synced to server). */

export function sessionChecksKey(dayId: string): string {
  return `fitboddy:plan-session-checks:${dayId}`
}

export function loadSessionChecks(dayId: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(sessionChecksKey(dayId))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((item): item is string => typeof item === 'string'))
  } catch {
    return new Set()
  }
}

export function saveSessionChecks(dayId: string, lineIds: Set<string>): void {
  try {
    sessionStorage.setItem(sessionChecksKey(dayId), JSON.stringify([...lineIds]))
  } catch {
    // ignore quota / private mode
  }
}

export function setChecksKey(dayId: string, lineId: string): string {
  return `fitboddy:set-checks:${dayId}:${lineId}`
}

export function loadSetChecks(dayId: string, lineId: string, total: number): boolean[] {
  const checks = Array.from({ length: total }, () => false)
  try {
    const raw = sessionStorage.getItem(setChecksKey(dayId, lineId))
    if (!raw) return checks
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return checks
    return checks.map((_, index) => parsed[index] === true)
  } catch {
    return checks
  }
}

export function saveSetChecks(dayId: string, lineId: string, checks: boolean[]): void {
  try {
    sessionStorage.setItem(setChecksKey(dayId, lineId), JSON.stringify(checks))
  } catch {
    // приватный режим
  }
}

export function clearSessionChecks(dayId: string): void {
  try {
    sessionStorage.removeItem(sessionChecksKey(dayId))
  } catch {
    // ignore
  }
}
