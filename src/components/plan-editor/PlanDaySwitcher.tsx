import { CheckCircle2 } from 'lucide-react'

import { editorDayLabel, type EditorDay } from '../../lib/plan-editor-draft'
import { cn } from '../../lib/utils'

type PlanDaySwitcherProps = {
  days: EditorDay[]
  selectedDayId: string
  onSelectDay: (dayId: string) => void
}

export function PlanDaySwitcher({ days, selectedDayId, onSelectDay }: PlanDaySwitcherProps) {
  const weeks = [...new Set(days.map((day) => day.week))].sort((left, right) => left - right)
  const selected = days.find((day) => day.dayId === selectedDayId) ?? days[0]
  const visibleDays = weeks.length > 1 ? days.filter((day) => day.week === selected?.week) : days

  return (
    <div className="space-y-3">
      {weeks.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Недели цикла">
          {weeks.map((week) => {
            const active = selected?.week === week
            const weekDay = days.find((day) => day.week === week)
            return (
              <button
                key={week}
                type="button"
                role="tab"
                aria-selected={active}
                className={cn(
                  'inline-flex min-h-11 shrink-0 items-center rounded-full px-3 py-1.5 text-sm',
                  active ? 'bg-primary text-primary-foreground' : 'border border-border bg-background hover:bg-secondary/70',
                )}
                onClick={() => {
                  if (weekDay) onSelectDay(weekDay.dayId)
                }}
              >
                Неделя {week}
              </button>
            )
          })}
        </div>
      ) : null}
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Дни цикла">
        {visibleDays.map((day) => {
          const active = day.dayId === selected?.dayId
          return (
            <button
              key={day.dayId}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn(
                'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm',
                active ? 'bg-primary text-primary-foreground' : 'border border-border bg-background hover:bg-secondary/70',
              )}
              onClick={() => onSelectDay(day.dayId)}
            >
              {day.isCompleted ? <CheckCircle2 size={14} aria-hidden="true" /> : null}
              {editorDayLabel(day)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
