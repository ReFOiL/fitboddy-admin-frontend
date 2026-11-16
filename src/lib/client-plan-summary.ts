import { isSkippedWorkout } from './plan-start'
import type { PlanDay, PlanExercise, TrainingPlan } from '../types/plan'

/** Минуты только из длительности подходов и отдыха между ними. Повторы без секунд не угадываем. */
export function estimateWorkoutMinutes(exercises: PlanExercise[]): number | null {
  let seconds = 0
  let hasWork = false
  for (const exercise of exercises) {
    const sets = exercise.sets && exercise.sets > 0 ? exercise.sets : exercise.set_prescriptions.length
    const duration = exercise.duration_seconds
    if (!duration || duration <= 0 || sets <= 0) continue
    seconds += duration * sets
    hasWork = true
    const rest = exercise.rest_seconds
    if (rest && rest > 0 && sets > 1) seconds += rest * (sets - 1)
  }
  if (!hasWork || seconds <= 0) return null
  return Math.max(1, Math.round(seconds / 60))
}

export function trainerNotes(exercises: PlanExercise[]): string[] {
  const notes: string[] = []
  for (const exercise of exercises) {
    const note = exercise.note?.trim()
    if (note && !notes.includes(note)) notes.push(note)
  }
  return notes
}

/**
 * Сколько полных недель тренировок закрыто подряд с конца плана.
 * Незакрытая последняя неделя серию не обнуляет: считаем предыдущие.
 * Нет ни одной закрытой недели — null, чтобы не рисовать «0 недель».
 */
export function completedWeekStreak(plan: TrainingPlan): number | null {
  const weeks = new Map<number, PlanDay[]>()
  for (const day of plan.days) {
    const bucket = weeks.get(day.week) ?? []
    bucket.push(day)
    weeks.set(day.week, bucket)
  }
  const ordered = [...weeks.keys()].sort((left, right) => left - right)
  if (ordered.length === 0) return null

  let streak = 0
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    const workouts = (weeks.get(ordered[index]) ?? []).filter((day) => day.exercises.length > 0)
    if (workouts.length === 0) continue
    if (workouts.every((day) => day.is_completed)) {
      streak += 1
      continue
    }
    if (streak === 0 && index === ordered.length - 1) continue
    break
  }
  return streak > 0 ? streak : null
}

export type ClientDayMark = 'done' | 'missed' | 'planned' | 'rest' | 'empty'

export function clientDayMark(
  day: PlanDay | undefined,
  todayIso: string,
  startIso: string | null | undefined,
): ClientDayMark {
  if (!day) return 'empty'
  if (day.exercises.length === 0) return 'rest'
  if (day.is_completed) return 'done'
  if (
    isSkippedWorkout(
      {
        week: day.week,
        scheduledFor: day.scheduled_for,
        exerciseCount: day.exercises.length,
        isCompleted: Boolean(day.is_completed),
      },
      todayIso,
      startIso,
    )
  ) {
    return 'missed'
  }
  return 'planned'
}

export const CLIENT_DAY_MARK_SYMBOL: Record<ClientDayMark, string> = {
  done: '✓',
  missed: '×',
  planned: '○',
  rest: '',
  empty: '',
}

const MARK_LABEL: Record<ClientDayMark, string> = {
  done: 'выполнено',
  missed: 'пропущено',
  planned: 'запланировано',
  rest: 'отдых',
  empty: '',
}

export function clientDayMarkLabel(mark: ClientDayMark): string {
  return MARK_LABEL[mark]
}
