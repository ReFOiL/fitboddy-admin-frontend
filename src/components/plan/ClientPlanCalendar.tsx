import { useState } from 'react'
import { Link } from 'react-router-dom'

import { calendarWeek, formatJsWeekdayShort, formatMonthDay, parseIsoDate, toIsoDate } from '../../lib/dates'
import { CLIENT_DAY_MARK_SYMBOL, clientDayMark, clientDayMarkLabel } from '../../lib/client-plan-summary'
import { pluralPhrase, EXERCISE_FORMS, WORKOUT_FORMS } from '../../lib/plural'
import { cn } from '../../lib/utils'
import type { PlanExercise, TrainingPlan } from '../../types/plan'
import { Button } from '../ui/button'

type ClientPlanCalendarProps = {
  plan: TrainingPlan
  todayIso: string
  trainerUserId?: string | null
  onStartToday: () => void
}

export function ClientPlanCalendar({ plan, todayIso, trainerUserId, onStartToday }: ClientPlanCalendarProps) {
  const weeks = [...new Set(plan.days.map((day) => day.week))].sort((left, right) => left - right)
  const todayWeek = plan.days.find((day) => day.scheduled_for.slice(0, 10) === todayIso)?.week ?? weeks[0] ?? 1
  const [week, setWeek] = useState(todayWeek)
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)
  const visibleWeek = weeks.includes(week) ? week : todayWeek
  const weekDays = plan.days.filter((day) => day.week === visibleWeek)
  const anchor = parseIsoDate(weekDays[0]?.scheduled_for ?? todayIso)
  const dates = anchor ? calendarWeek(anchor) : []
  const selected =
    weekDays.find((day) => day.day_id === selectedDayId) ??
    weekDays.find((day) => day.scheduled_for.slice(0, 10) === todayIso) ??
    weekDays.find((day) => day.exercises.length > 0) ??
    null
  const workoutCount = plan.days.filter((day) => day.exercises.length > 0).length
  const exerciseCount = plan.days.reduce((total, day) => total + day.exercises.length, 0)
  const weekIndex = weeks.indexOf(visibleWeek)
  const canStart =
    Boolean(selected) &&
    selected!.scheduled_for.slice(0, 10) === todayIso &&
    !selected!.is_completed &&
    selected!.exercises.length > 0

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-[17px] font-semibold">Неделя {visibleWeek}</h2>
          <p className="text-[15px] text-secondary-foreground">
            {pluralPhrase(workoutCount, WORKOUT_FORMS)} · {pluralPhrase(exerciseCount, EXERCISE_FORMS)}
          </p>
        </div>
        {weeks.length > 1 ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-12 px-3"
              disabled={weekIndex <= 0}
              onClick={() => setWeek(weeks[weekIndex - 1] ?? visibleWeek)}
            >
              Назад
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-12 px-3"
              disabled={weekIndex < 0 || weekIndex >= weeks.length - 1}
              onClick={() => setWeek(weeks[weekIndex + 1] ?? visibleWeek)}
            >
              Дальше
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid w-full grid-cols-7 gap-1">
        {dates.map((date) => {
          const iso = toIsoDate(date)
          const day = weekDays.find((item) => item.scheduled_for.slice(0, 10) === iso)
          const mark = clientDayMark(day, todayIso, plan.start_date)
          const symbol = CLIENT_DAY_MARK_SYMBOL[mark]
          const selectedDay = day?.day_id === selected?.day_id
          const isToday = iso === todayIso
          const markLabel = clientDayMarkLabel(mark)
          return (
            <button
              key={iso}
              type="button"
              disabled={!day}
              aria-pressed={selectedDay}
              aria-label={[formatJsWeekdayShort(date), String(date.getDate()), isToday ? 'сегодня' : '', markLabel]
                .filter(Boolean)
                .join(', ')}
              onClick={() => day && setSelectedDayId(day.day_id)}
              className={cn(
                'flex min-h-16 min-w-0 flex-col items-center justify-center rounded-2xl border px-0.5 py-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-40',
                selectedDay
                  ? 'border-primary bg-primary text-primary-foreground'
                  : isToday
                    ? 'border-primary bg-card'
                    : 'border-transparent bg-secondary text-secondary-foreground',
              )}
            >
              <span className="text-[11px] font-semibold uppercase leading-none">{formatJsWeekdayShort(date)}</span>
              <span className="mt-1 text-[15px] font-semibold leading-none">{date.getDate()}</span>
              <span className="mt-1 h-4 text-[15px] leading-none" aria-hidden>
                {symbol}
              </span>
            </button>
          )
        })}
      </div>

      {selected ? (
        <div className="rounded-3xl border border-border bg-card p-4">
          <h3 className="text-[17px] font-semibold">
            {formatJsWeekdayShort(parseIsoDate(selected.scheduled_for) ?? new Date())}, {formatMonthDay(selected.scheduled_for)}
            {selected.scheduled_for.slice(0, 10) === todayIso ? ' · сегодня' : ''}
          </h3>
          {selected.exercises.length === 0 ? (
            <p className="mt-2 text-[15px] text-secondary-foreground">День отдыха</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {selected.exercises.map((exercise) => (
                <li key={exercise.line_id}>
                  <Link
                    to={exerciseDetailsTo(exercise, trainerUserId)}
                    className="flex min-h-12 items-center text-[17px] font-semibold"
                  >
                    {exercise.exercise_name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {canStart ? (
            <Button type="button" size="lg" className="mt-4 w-full" onClick={onStartToday}>
              Начать
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="text-[15px] text-secondary-foreground">В этой неделе нет дней плана.</p>
      )}
    </section>
  )
}

function exerciseDetailsTo(exercise: PlanExercise, trainerUserId: string | null | undefined): string {
  const params = new URLSearchParams()
  if (trainerUserId) params.set('trainer', trainerUserId)
  params.set('line', exercise.line_id)
  if (exercise.note?.trim()) params.set('note', exercise.note.trim())
  const query = params.toString()
  return `/plan/exercises/${encodeURIComponent(exercise.exercise_id)}${query ? `?${query}` : ''}`
}
