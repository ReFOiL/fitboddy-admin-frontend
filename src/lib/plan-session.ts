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

function workoutStartKey(dayId: string): string {
  return `fitboddy:workout-start:${dayId}`
}

/** Запоминает момент «Начать тренировку», чтобы отправить его при завершении дня. */
export function markWorkoutStarted(dayId: string, now = new Date()): string {
  const key = workoutStartKey(dayId)
  try {
    const existing = localStorage.getItem(key)
    if (existing) return existing
    const stamp = now.toISOString()
    localStorage.setItem(key, stamp)
    return stamp
  } catch {
    return now.toISOString()
  }
}

export function loadWorkoutStart(dayId: string): string | null {
  try {
    return localStorage.getItem(workoutStartKey(dayId))
  } catch {
    return null
  }
}

export function clearWorkoutStart(dayId: string): void {
  try {
    localStorage.removeItem(workoutStartKey(dayId))
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

const ACTIVE_WORKOUT_KEY = 'fitboddy:workout-active-day'

/** День, который клиент сейчас выполняет. Живёт дольше памяти страницы, чтобы вкладки его не стирали. */
export function loadActiveWorkoutDay(): string | null {
  try {
    const value = sessionStorage.getItem(ACTIVE_WORKOUT_KEY)
    return value && value.trim() ? value : null
  } catch {
    return null
  }
}

export function saveActiveWorkoutDay(dayId: string): void {
  try {
    sessionStorage.setItem(ACTIVE_WORKOUT_KEY, dayId)
  } catch {
    // приватный режим
  }
}

export function clearActiveWorkoutDay(): void {
  try {
    sessionStorage.removeItem(ACTIVE_WORKOUT_KEY)
  } catch {
    // приватный режим
  }
}

export function markLineChecked(dayId: string, lineId: string): Set<string> {
  const next = loadSessionChecks(dayId)
  next.add(lineId)
  saveSessionChecks(dayId, next)
  return next
}

/** Таймер отдыха на экране подхода: 90 → «1:30». */
export function formatRestClock(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
