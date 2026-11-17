import { calendarWeekBounds, formatWeekSpan } from './dates'
import { pluralPhrase } from './plural'
import { isSkippedWorkout } from './plan-start'

const FOCUS_LABEL: Record<string, string> = {
  upper: 'Верх тела',
  lower: 'Низ тела',
  legs: 'Низ тела',
  core: 'Корпус',
  full: 'Полное тело',
  full_body: 'Полное тело',
  cardio: 'Кардио',
}

export type DayMarkKind = 'done' | 'today' | 'missed' | 'upcoming'

export function dayFocusLabel(categories: readonly (string | null | undefined)[]): string | null {
  const labels = new Set<string>()
  for (const category of categories) {
    if (!category) continue
    const label = FOCUS_LABEL[category]
    if (label) labels.add(label)
  }
  if (labels.size === 0) return null
  if (labels.size === 1) return [...labels][0] ?? null
  return 'Полное тело'
}

export function exerciseCountShort(count: number): string {
  return `${count} упр.`
}

export function dayMarkKind(input: {
  scheduledFor: string
  isCompleted: boolean
  exerciseCount: number
  week: number
  todayIso: string
  startIso: string | null
}): DayMarkKind {
  if (input.isCompleted) return 'done'
  if (input.scheduledFor.slice(0, 10) === input.todayIso) return 'today'
  if (
    isSkippedWorkout(
      {
        week: input.week,
        scheduledFor: input.scheduledFor,
        exerciseCount: input.exerciseCount,
        isCompleted: input.isCompleted,
      },
      input.todayIso,
      input.startIso,
    )
  ) {
    return 'missed'
  }
  return 'upcoming'
}

export function dayMarkLabel(kind: DayMarkKind): string {
  switch (kind) {
    case 'done':
      return 'Выполнено'
    case 'today':
      return 'Сегодня, ещё не выполнено'
    case 'missed':
      return 'Пропуск'
    case 'upcoming':
      return 'Предстоит'
    default: {
      const unreachable: never = kind
      return unreachable
    }
  }
}

export function weekRangeLabel(scheduledFor: string | undefined): string {
  if (!scheduledFor) return ''
  const bounds = calendarWeekBounds(scheduledFor)
  if (!bounds) return ''
  return formatWeekSpan(bounds.start, bounds.end)
}

export function missedWeekLabel(count: number): string | null {
  if (count <= 0) return null
  return pluralPhrase(count, ['пропуск', 'пропуска', 'пропусков'])
}
