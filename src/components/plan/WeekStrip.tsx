import { Check } from 'lucide-react'

import { calendarWeek, formatJsWeekdayShort, parseIsoDate, toIsoDate } from '../../lib/dates'
import { cn } from '../../lib/utils'
import type { PlanDay } from '../../types/plan'

type WeekStripProps = {
  days: PlanDay[]
  focusedDayId: string | null
  todayIso: string
  onSelectDay: (dayId: string) => void
}

export function WeekStrip({ days, focusedDayId, todayIso, onSelectDay }: WeekStripProps) {
  const anchor = parseIsoDate(todayIso) ?? parseIsoDate(days[0]?.scheduled_for ?? '')
  if (!anchor) return null
  const week = calendarWeek(anchor)

  return (
    <div className="grid w-full grid-cols-7 gap-1">
      {week.map((date) => {
        const iso = toIsoDate(date)
        const planDay = days.find((day) => day.scheduled_for.slice(0, 10) === iso)
        const hasWorkout = Boolean(planDay && planDay.exercises.length > 0)
        const isDone = Boolean(planDay?.is_completed && hasWorkout)
        const isToday = iso === todayIso
        const isSelected = Boolean(planDay && planDay.day_id === focusedDayId)
        const label = [
          formatJsWeekdayShort(date),
          String(date.getDate()),
          isToday ? 'сегодня' : '',
          isDone ? 'выполнено' : hasWorkout ? 'есть тренировка' : '',
        ]
          .filter(Boolean)
          .join(', ')
        return (
          <button
            key={iso}
            type="button"
            disabled={!planDay}
            aria-pressed={isSelected}
            aria-label={label}
            onClick={() => planDay && onSelectDay(planDay.day_id)}
            className={cn(
              'flex min-h-16 min-w-0 flex-col items-center justify-center rounded-2xl border px-0.5 py-1.5 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-40',
              isSelected
                ? 'border-primary bg-primary text-primary-foreground'
                : isToday
                  ? 'border-primary bg-card text-foreground'
                  : 'border-transparent bg-secondary text-secondary-foreground',
            )}
          >
            <span className="text-[11px] font-semibold uppercase leading-none">{formatJsWeekdayShort(date)}</span>
            <span className="mt-1 text-[15px] font-semibold leading-none">{date.getDate()}</span>
            <span className="mt-1 flex h-3 items-center justify-center" aria-hidden>
              {isDone ? (
                <Check size={12} className={isSelected ? 'text-primary-foreground' : 'text-accent-ink'} />
              ) : hasWorkout ? (
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    isSelected ? 'bg-primary-foreground' : 'bg-primary',
                  )}
                />
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
