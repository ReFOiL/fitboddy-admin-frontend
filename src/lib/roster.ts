import { addIsoDays, formatMonthDay, isoDayDiff, missedWorkoutsLabel } from './dates'
import { isSkippedWorkout } from './plan-start'
import type { PlanDay, TrainingPlan } from '../types/plan'

export type PlanLoadState = 'loading' | 'missing' | 'error' | 'ready'

export type ClientFilter = 'all' | 'today' | 'missed' | 'no-plan'

export function todayPlanDay(plan: TrainingPlan | null | undefined, todayIso: string): PlanDay | null {
  if (!plan) return null
  return plan.days.find((day) => day.scheduled_for.slice(0, 10) === todayIso) ?? null
}

export function missedPlanDays(plan: TrainingPlan, todayIso: string): PlanDay[] {
  return plan.days.filter((day) =>
    isSkippedWorkout(
      {
        week: day.week,
        scheduledFor: day.scheduled_for,
        exerciseCount: day.exercises.length,
        isCompleted: Boolean(day.is_completed),
      },
      todayIso,
      plan.start_date,
    ),
  )
}

export function weekProgress(plan: TrainingPlan, week: number): { done: number; total: number } {
  const days = plan.days.filter((day) => day.week === week)
  return { done: days.filter((day) => day.is_completed).length, total: days.length }
}

export function lastCompletedDay(plan: TrainingPlan): PlanDay | null {
  return (
    [...plan.days]
      .filter((day) => day.is_completed)
      .sort((left, right) => right.scheduled_for.localeCompare(left.scheduled_for))[0] ?? null
  )
}

export function trainingTodaySubtitle(day: PlanDay): string {
  const time = day.scheduled_time ? ` · ${day.scheduled_time.slice(0, 5)}` : ''
  if (day.is_completed) return `День ${day.day_index}${time} · сделано`
  const names = day.exercises.slice(0, 2).map((item) => item.exercise_name)
  const extra = day.exercises.length > names.length ? ` +${day.exercises.length - names.length}` : ''
  if (names.length > 0) return `День ${day.day_index}${time} · ${names.join(', ')}${extra}`
  return `День ${day.day_index}${time} · нет упражнений`
}

function addedLabel(createdAt: string, todayIso: string): string {
  const created = createdAt.slice(0, 10)
  if (created === todayIso) return 'Новый клиент'
  if (created === addIsoDays(todayIso, -1)) return 'Добавлен вчера'
  return 'Нет плана'
}

export function clientListSubtitle(input: {
  planState: PlanLoadState
  plan: TrainingPlan | null
  todayIso: string
  createdAt: string
}): string {
  const { planState, plan, todayIso, createdAt } = input
  if (planState === 'loading') return 'Загрузка плана'
  if (planState === 'error') return 'Не удалось загрузить план'
  if (planState === 'missing' || !plan) return addedLabel(createdAt, todayIso)

  const today = todayPlanDay(plan, todayIso)
  if (today?.is_completed) return 'Сделано сегодня'
  if (today) {
    const progress = weekProgress(plan, today.week)
    return `Сегодня · ${progress.done} из ${progress.total} на неделе`
  }
  const last = lastCompletedDay(plan)
  if (last) return `Последняя: ${formatMonthDay(last.scheduled_for)}`
  return 'План есть'
}

export function attentionSubtitle(input: {
  planState: PlanLoadState
  plan: TrainingPlan | null
  todayIso: string
  createdAt: string
}): string | null {
  const { planState, plan, todayIso, createdAt } = input
  if (planState === 'ready' && plan) {
    const missed = missedPlanDays(plan, todayIso).length
    if (missed > 0) return missedWorkoutsLabel(missed)
    return null
  }
  if (planState === 'missing') return addedLabel(createdAt, todayIso)
  return null
}

export type ClientRosterStatus = 'loading' | 'error' | 'no-plan' | 'active' | 'missed'

export type ClientRosterHighlight = 'none' | 'ending' | 'absent'

export type ClientRosterFacts = {
  status: ClientRosterStatus
  planUntilIso: string | null
  lastWorkoutIso: string | null
  missedCount: number | null
  highlight: ClientRosterHighlight
  tag: 'План заканчивается' | 'Давно не тренировался' | null
}

const PLAN_ENDING_WINDOW_DAYS = 7
const LONG_ABSENCE_DAYS = 7

function isLongAbsence(lastIso: string | null, missed: PlanDay[], todayIso: string): boolean {
  if (lastIso) {
    const since = isoDayDiff(lastIso, todayIso)
    return since != null && since > LONG_ABSENCE_DAYS
  }
  if (missed.length === 0) return false
  const oldest = missed.map((day) => day.scheduled_for.slice(0, 10)).sort()[0]
  if (!oldest) return false
  const since = isoDayDiff(oldest, todayIso)
  return since != null && since > LONG_ABSENCE_DAYS
}

/**
 * Сводка строки списка. План уже пришёл в составе: дата окончания,
 * последняя выполненная тренировка и пропуски. Отдельного запроса нет.
 */
export function clientRosterFacts(input: {
  planState: PlanLoadState
  plan: TrainingPlan | null
  todayIso: string
}): ClientRosterFacts {
  const blank = {
    planUntilIso: null,
    lastWorkoutIso: null,
    missedCount: null,
    highlight: 'none' as const,
    tag: null,
  }
  if (input.planState === 'loading') return { ...blank, status: 'loading' }
  if (input.planState === 'error') return { ...blank, status: 'error' }
  if (input.planState === 'missing' || !input.plan) return { ...blank, status: 'no-plan' }

  const missed = missedPlanDays(input.plan, input.todayIso)
  const last = lastCompletedDay(input.plan)
  const lastIso = last ? last.scheduled_for.slice(0, 10) : null
  const until = input.plan.end_date.slice(0, 10)
  const daysUntilEnd = isoDayDiff(input.todayIso, until)
  const ending = daysUntilEnd != null && daysUntilEnd >= 0 && daysUntilEnd <= PLAN_ENDING_WINDOW_DAYS
  const absent = isLongAbsence(lastIso, missed, input.todayIso)
  let highlight: ClientRosterHighlight = 'none'
  if (absent) highlight = 'absent'
  else if (ending) highlight = 'ending'
  let tag: ClientRosterFacts['tag'] = null
  if (highlight === 'absent') tag = 'Давно не тренировался'
  else if (highlight === 'ending') tag = 'План заканчивается'
  return {
    status: missed.length > 0 ? 'missed' : 'active',
    planUntilIso: until,
    lastWorkoutIso: lastIso,
    missedCount: missed.length,
    highlight,
    tag,
  }
}

export function clientStatusLabel(status: ClientRosterStatus): string {
  switch (status) {
    case 'loading':
      return 'Загрузка…'
    case 'error':
      return 'Не удалось загрузить'
    case 'no-plan':
      return 'Нет плана'
    case 'missed':
      return 'Пропуски'
    case 'active':
      return 'Активна'
    default: {
      const unreachable: never = status
      return unreachable
    }
  }
}

export function matchesClientFilter(
  filter: ClientFilter,
  input: { planState: PlanLoadState; plan: TrainingPlan | null; todayIso: string },
): boolean {
  if (filter === 'all') return true
  if (filter === 'no-plan') return input.planState === 'missing'
  if (input.planState !== 'ready' || !input.plan) return false
  if (filter === 'today') return Boolean(todayPlanDay(input.plan, input.todayIso))
  return missedPlanDays(input.plan, input.todayIso).length > 0
}
