import type { ReactNode } from 'react'
import { CalendarDays, CheckCircle2, Play } from 'lucide-react'

import { formatExerciseSummary, formatPlanDate, formatWeekday } from '../../lib/plan-formatters'
import type { PlanDaySelection } from '../../lib/plan-day-selector'
import type { TodayWorkout } from '../../types/plan'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Skeleton } from '../ui/skeleton'
import { QueryState } from '../shared'

type TodayWorkoutCardProps = {
  selection: PlanDaySelection
  todayIso: string
  todayWorkout?: TodayWorkout
  todayLoading?: boolean
  todayMissing?: boolean
  todayError?: boolean
  planSourceLabel: string
  onStartWorkout: () => void
  noPlanAction?: ReactNode
  restAction?: ReactNode
  onRetry?: () => void
}

export function TodayWorkoutCard({
  selection,
  todayIso,
  todayWorkout,
  todayLoading = false,
  todayMissing = false,
  todayError = false,
  planSourceLabel,
  onStartWorkout,
  noPlanAction,
  restAction,
  onRetry,
}: TodayWorkoutCardProps) {
  const focusedDay = selection.day

  return (
    <Card className="overflow-hidden border-primary/25">
      <CardContent className="space-y-4 p-4 sm:p-5">
        {selection.kind === 'no-plan' ? (
          <div className="space-y-3 py-2 text-center">
            <RestIcon />
            <div>
              <div className="text-lg font-semibold">Нет активного плана</div>
              <p className="mt-1 text-sm text-secondary-foreground">Создай план, чтобы увидеть ближайшую тренировку.</p>
            </div>
            {noPlanAction}
          </div>
        ) : null}

        {selection.kind === 'rest' && todayLoading ? <Skeleton className="h-28 w-full rounded-xl" /> : null}

        {selection.kind === 'rest' && !todayLoading && todayMissing ? (
          <div className="space-y-3 py-2 text-center">
            <RestIcon />
            <div>
              <div className="text-lg font-semibold">День отдыха</div>
              <p className="mt-1 text-sm text-secondary-foreground">
                Сегодня в плане нет тренировки. Выбери день в полоске выше или открой расписание.
              </p>
            </div>
            {restAction}
          </div>
        ) : null}

        {selection.kind === 'rest' && !todayLoading && todayError && !todayMissing ? (
          <QueryState
            isError
            errorTitle="Не удалось загрузить тренировку"
            onRetry={onRetry}
          >
            {null}
          </QueryState>
        ) : null}

        {selection.kind === 'workout' && focusedDay ? (
          <>
            <div className="space-y-1">
              <div className="text-xs font-medium uppercase tracking-wide text-secondary-foreground">
                {selection.isToday ? 'Сегодня' : formatPlanDate(focusedDay.scheduled_for)}
              </div>
              <div className="text-2xl font-semibold tracking-tight">{formatWeekday(focusedDay.day_of_week)}</div>
              <div className="text-sm text-secondary-foreground">
                {formatPlanDate(focusedDay.scheduled_for)} · {planSourceLabel} · {focusedDay.exercises.length} упр.
              </div>
            </div>

            {focusedDay.is_completed ? (
              <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
                <CheckCircle2 size={18} />
                Тренировка выполнена
              </div>
            ) : selection.isToday && todayWorkout ? (
              <Button type="button" size="lg" className="h-14 w-full text-base" onClick={onStartWorkout}>
                <Play size={18} />
                Начать тренировку
              </Button>
            ) : selection.isToday && todayLoading ? (
              <Skeleton className="h-14 w-full rounded-xl" />
            ) : (
              <p className="rounded-xl border border-border/60 bg-secondary/15 px-4 py-3 text-sm text-secondary-foreground">
                {focusedDay.scheduled_for > todayIso
                  ? 'Превью будущей тренировки — начать можно в день по расписанию.'
                  : 'Просмотр прошедшей тренировки.'}
              </p>
            )}

            <ul className="space-y-2">
              {(selection.isToday && !focusedDay.is_completed
                ? focusedDay.exercises.slice(0, 4)
                : focusedDay.exercises
              ).map((exercise) => (
                <li
                  key={exercise.line_id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-secondary/10 px-3 py-2.5 text-sm"
                >
                  <span className="min-w-0 truncate font-medium">{exercise.exercise_name}</span>
                  <span className="shrink-0 text-xs text-secondary-foreground">
                    {formatExerciseSummary(exercise)}
                  </span>
                </li>
              ))}
              {selection.isToday && !focusedDay.is_completed && focusedDay.exercises.length > 4 ? (
                <li className="px-1 text-xs text-secondary-foreground">ещё {focusedDay.exercises.length - 4}…</li>
              ) : null}
            </ul>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

function RestIcon() {
  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-secondary/30 text-primary">
      <CalendarDays size={26} />
    </div>
  )
}
