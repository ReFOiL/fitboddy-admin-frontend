import { Check } from 'lucide-react'

import { formatPlanDate, formatWeekdayShort } from '../../lib/plan-formatters'
import { cn } from '../../lib/utils'
import type { PlanDay } from '../../types/plan'

type WeekStripProps = {
  days: PlanDay[]
  focusedDayId: string | null
  todayIso: string
  onSelectDay: (dayId: string) => void
}

export function WeekStrip({ days, focusedDayId, todayIso, onSelectDay }: WeekStripProps) {
  if (days.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {days.map((day) => {
        const isToday = day.scheduled_for === todayIso
        const isSelected = day.day_id === focusedDayId
        return (
          <button
            key={day.day_id}
            type="button"
            aria-pressed={isSelected}
            aria-label={`${formatWeekdayShort(day.day_of_week)}, ${formatPlanDate(day.scheduled_for)}${isToday ? ', сегодня' : ''}${day.is_completed ? ', выполнено' : ''}`}
            onClick={() => onSelectDay(day.day_id)}
            className={cn(
              'flex min-w-[3.25rem] flex-col items-center rounded-2xl border px-2.5 py-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
              isSelected
                ? 'border-primary bg-primary/15 text-foreground ring-2 ring-primary/30'
                : day.is_completed
                  ? 'border-border/50 bg-secondary/20 text-secondary-foreground'
                  : 'border-border/70 bg-background/60',
              !isSelected && isToday ? 'border-primary/50' : null,
            )}
          >
            <span className="text-[11px] font-medium uppercase tracking-wide">
              {formatWeekdayShort(day.day_of_week)}
            </span>
            <span className="text-sm font-semibold">{formatPlanDate(day.scheduled_for)}</span>
            {day.is_completed ? <Check size={12} className="mt-0.5 text-primary" /> : null}
            {isToday && !day.is_completed ? (
              <span className="mt-0.5 text-[10px] font-semibold text-primary">сегодня</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
