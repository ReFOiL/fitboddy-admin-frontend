import { CalendarDays, CheckCircle2, Dumbbell, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { formatPlanDate, formatWeekdayShort } from '../../lib/plan-formatters'
import { cn } from '../../lib/utils'
import type { PlanDay } from '../../types/plan'

type PlanScheduleProps = {
  days: PlanDay[]
  todayIso: string
  trainerUserId?: string | null
}

export function PlanSchedule({ days, todayIso, trainerUserId }: PlanScheduleProps) {
  const [isOpen, setIsOpen] = useState(false)
  const daysByWeek = days.reduce<Record<number, PlanDay[]>>((grouped, day) => {
    if (!grouped[day.week]) grouped[day.week] = []
    grouped[day.week].push(day)
    return grouped
  }, {})
  const weekEntries = Object.entries(daysByWeek).sort(([left], [right]) => Number(left) - Number(right))
  const totalExercises = days.reduce((total, day) => total + day.exercises.length, 0)

  return (
    <div className="rounded-2xl border border-border/70">
      <button
        type="button"
        className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
      >
        <CalendarDays size={18} className="text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Расписание</span>
          <span className="mt-0.5 block text-xs text-secondary-foreground">
            {days.length} тренировок · {totalExercises} упражнений
          </span>
        </span>
        {isOpen ? <X size={16} className="opacity-60" /> : <Dumbbell size={16} className="opacity-60" />}
      </button>
      {isOpen ? (
        <div className="space-y-3 border-t border-border/60 px-4 py-4">
          {weekEntries.map(([week, weekDays]) => (
            <div key={week} className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
                Неделя {week}
              </div>
              {weekDays.map((day) => (
                <div
                  key={day.day_id}
                  className={cn(
                    'rounded-xl border px-3 py-2.5',
                    day.scheduled_for === todayIso ? 'border-primary/40 bg-primary/5' : 'border-border/60',
                  )}
                >
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">
                      {formatWeekdayShort(day.day_of_week)} · {formatPlanDate(day.scheduled_for)}
                    </span>
                    {day.is_completed ? (
                      <CheckCircle2 size={14} className="text-primary" />
                    ) : (
                      <span className="text-xs text-secondary-foreground">{day.exercises.length} упр.</span>
                    )}
                  </div>
                  <ul className="mt-1 space-y-0.5 text-xs text-secondary-foreground">
                    {day.exercises.map((exercise) => (
                      <li key={exercise.line_id}>
                        <Link
                          to={exerciseDetailsTo(exercise.exercise_id, trainerUserId)}
                          className="inline-flex min-h-11 items-center rounded-md hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        >
                          {exercise.exercise_name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function exerciseDetailsTo(exerciseId: string, trainerUserId: string | null | undefined): string {
  return trainerUserId
    ? `/plan/exercises/${encodeURIComponent(exerciseId)}?trainer=${encodeURIComponent(trainerUserId)}`
    : `/plan/exercises/${encodeURIComponent(exerciseId)}`
}
