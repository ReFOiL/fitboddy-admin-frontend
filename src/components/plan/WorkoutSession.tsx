import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { formatWorkoutSessionTitle } from '../../lib/dates'
import { formatDosage } from '../../lib/plan-draft'
import { EXERCISE_FORMS, plural } from '../../lib/plural'
import { cn } from '../../lib/utils'
import type { PlanExercise, TodayWorkout } from '../../types/plan'
import { Button } from '../ui/button'
import { ExerciseThumb } from '../ui/kit'

type WorkoutSessionProps = {
  workout: TodayWorkout
  checkedLineIds: Set<string>
  checkedCount: number
  exerciseTotal: number
  busy: boolean
  completing: boolean
  trainerName?: string
  onCollapse: () => void
  onToggleChecked: (lineId: string) => void
  onFinish: () => void
}

export function WorkoutSession({
  workout,
  checkedLineIds,
  checkedCount,
  exerciseTotal,
  busy,
  completing,
  trainerName,
  onCollapse,
  onToggleChecked,
  onFinish,
}: WorkoutSessionProps) {
  const allChecked = exerciseTotal > 0 && checkedCount === exerciseTotal
  const requestFinish = () => {
    if (busy || completing) return
    if (!allChecked && !window.confirm('Не все упражнения отмечены. Завершить тренировку?')) return
    onFinish()
  }

  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-lg flex-col pb-28">
      <div className="flex items-center gap-2">
        <button type="button" className="flex h-12 w-12 shrink-0 items-center justify-center" aria-label="Свернуть" onClick={onCollapse}>
          <ChevronLeft size={22} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate whitespace-nowrap text-[17px] font-bold">{formatWorkoutSessionTitle(workout.scheduled_for)}</h1>
          <div className="truncate text-[15px] text-secondary-foreground">
            {checkedCount}/{exerciseTotal} {plural(exerciseTotal, EXERCISE_FORMS)}
            {trainerName ? ` · тренер ${trainerName}` : ''}
          </div>
        </div>
      </div>

      <div>
        {workout.exercises.map((exercise, index) => {
          const done = checkedLineIds.has(exercise.line_id)
          const detailsTo = exerciseDetailsTo(exercise, workout, index + 1)
          return (
            <div key={exercise.line_id} className="flex min-h-16 items-center gap-3 border-b border-border py-2">
              <button
                type="button"
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2',
                  done ? 'border-primary bg-primary text-primary-foreground' : 'border-foreground bg-card text-foreground',
                )}
                aria-pressed={done}
                aria-label={done ? 'Снять отметку' : 'Отметить выполненным'}
                onClick={() => onToggleChecked(exercise.line_id)}
              >
                {done ? <Check size={20} strokeWidth={2.5} /> : null}
              </button>
              <Link to={detailsTo} className="flex min-w-0 flex-1 items-center gap-3">
                <ExerciseThumb />
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-[17px] font-semibold', done && 'line-through')}>
                    {exercise.exercise_name}
                  </span>
                  <span className="block truncate text-[15px] text-secondary-foreground">
                    {formatDosage(exercise, { includeRest: false })}
                  </span>
                </span>
                <ChevronRight size={18} aria-hidden />
              </Link>
            </div>
          )
        })}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 border-t border-border bg-background px-4 py-3 md:bottom-0">
        <div className="mx-auto grid w-full max-w-lg grid-cols-2 gap-2">
          <Button type="button" variant="secondary" size="lg" className="w-full px-2" disabled={busy || completing} onClick={requestFinish}>
            {completing ? 'Сохраняем…' : 'Завершить'}
          </Button>
          <Button asChild size="lg" className="w-full px-2">
            <Link to={nextDetails(workout, checkedLineIds)}>Продолжить</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function exerciseDetailsTo(exercise: PlanExercise, workout: TodayWorkout, index = 1): string {
  const params = new URLSearchParams()
  params.set('progress', `${index} из ${workout.exercises.length}`)
  if (workout.trainer_user_id) params.set('trainer', workout.trainer_user_id)
  params.set('sets', String(exercise.sets ?? exercise.set_prescriptions.length ?? 0))
  if (exercise.note?.trim()) params.set('note', exercise.note.trim())
  if (exercise.reps != null) params.set('reps', String(exercise.reps))
  if (exercise.weight_kg != null) params.set('weight', String(exercise.weight_kg))
  if (exercise.rest_seconds != null) params.set('rest', String(exercise.rest_seconds))
  if (exercise.duration_seconds != null) params.set('duration', String(exercise.duration_seconds))
  params.set('line', exercise.line_id)
  params.set('day', workout.day_id)
  params.set('dayIndex', String(workout.day_index))
  params.set('lines', workout.exercises.map((item) => item.line_id).join(','))
  const query = params.toString()
  return `/plan/exercises/${encodeURIComponent(exercise.exercise_id)}${query ? `?${query}` : ''}`
}

function nextDetails(workout: TodayWorkout, checked: Set<string>): string {
  const next = workout.exercises.find((exercise) => !checked.has(exercise.line_id)) ?? workout.exercises[0]
  const index = next ? workout.exercises.findIndex((exercise) => exercise.line_id === next.line_id) + 1 : 1
  return next ? exerciseDetailsTo(next, workout, index) : '/plan-generation'
}
