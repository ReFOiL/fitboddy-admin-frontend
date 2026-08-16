import { Check, CheckCircle2, ChevronLeft, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  formatExerciseSummary,
  formatSetLine,
  formatWeekday,
  hasSetProgression,
} from '../../lib/plan-formatters'
import { cn } from '../../lib/utils'
import type { TodayWorkout } from '../../types/plan'
import { Button } from '../ui/button'

type WorkoutSessionProps = {
  workout: TodayWorkout
  checkedLineIds: Set<string>
  checkedCount: number
  exerciseTotal: number
  busy: boolean
  completing: boolean
  onCollapse: () => void
  onToggleChecked: (lineId: string) => void
  onReplaceExercise: (lineId: string) => void
  onFinish: () => void
}

export function WorkoutSession({
  workout,
  checkedLineIds,
  checkedCount,
  exerciseTotal,
  busy,
  completing,
  onCollapse,
  onToggleChecked,
  onReplaceExercise,
  onFinish,
}: WorkoutSessionProps) {
  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-lg flex-col gap-4 pb-28">
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCollapse}>
          <ChevronLeft size={16} />
          Свернуть
        </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{formatWeekday(workout.day_of_week)}</div>
          <div className="text-xs text-secondary-foreground">
            {checkedCount}/{exerciseTotal} упражнений
          </div>
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-secondary/60">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: exerciseTotal > 0 ? `${(checkedCount / exerciseTotal) * 100}%` : '0%' }}
        />
      </div>

      <div className="space-y-3">
        {workout.exercises.map((exercise, index) => {
          const prescriptions = Array.isArray(exercise.set_prescriptions) ? exercise.set_prescriptions : []
          const showSetList = hasSetProgression(prescriptions)
          const done = checkedLineIds.has(exercise.line_id)
          const detailsTo = exerciseDetailsTo(exercise.exercise_id, workout.trainer_user_id)
          return (
            <div
              key={exercise.line_id}
              className={cn(
                'rounded-2xl border px-3 py-3 transition',
                done ? 'border-primary/40 bg-primary/10' : 'border-border/70 bg-secondary/15',
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  className={cn(
                    'mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold transition',
                    done
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-secondary-foreground',
                  )}
                  aria-pressed={done}
                  aria-label={done ? 'Снять отметку' : 'Отметить выполненным'}
                  onClick={() => onToggleChecked(exercise.line_id)}
                >
                  {done ? <Check size={20} /> : index + 1}
                </button>
                <div className="min-w-0 flex-1">
                  <div className={cn('text-base font-semibold', done && 'text-secondary-foreground line-through')}>
                    {exercise.exercise_name}
                  </div>
                  {showSetList ? (
                    <ul className="mt-1 space-y-0.5 text-xs text-secondary-foreground">
                      {prescriptions.map((item) => (
                        <li key={`${exercise.line_id}-${item.set_index}`}>{formatSetLine(item)}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-1 text-xs text-secondary-foreground">{formatExerciseSummary(exercise)}</div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild type="button" size="sm" variant="secondary">
                      <Link to={detailsTo}>Подробнее</Link>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => onReplaceExercise(exercise.line_id)}
                    >
                      <RefreshCw size={14} />
                      Заменить
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 border-t border-border/80 bg-background/95 px-4 py-3 backdrop-blur md:bottom-0">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
          <div className="text-center text-xs text-secondary-foreground">
            {checkedCount}/{exerciseTotal} готово
          </div>
          <Button type="button" size="lg" className="h-12 w-full text-base" disabled={busy} onClick={onFinish}>
            <CheckCircle2 size={18} />
            {completing ? 'Сохраняем…' : 'Завершить тренировку'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function exerciseDetailsTo(exerciseId: string, trainerUserId: string | null | undefined): string {
  return trainerUserId
    ? `/plan/exercises/${encodeURIComponent(exerciseId)}?trainer=${encodeURIComponent(trainerUserId)}`
    : `/plan/exercises/${encodeURIComponent(exerciseId)}`
}
