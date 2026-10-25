import { addIsoDays, formatMonthDay, missedWorkoutsLabel } from './dates'
import type { PlanDay, TrainingPlan } from '../types/plan'

export type PlanLoadState = 'loading' | 'missing' | 'error' | 'ready'

export type ClientFilter = 'all' | 'today' | 'missed' | 'no-plan'

export function todayPlanDay(plan: TrainingPlan | null | undefined, todayIso: string): PlanDay | null {
  if (!plan) return null
  return plan.days.find((day) => day.scheduled_for.slice(0, 10) === todayIso) ?? null
}

export function missedPlanDays(plan: TrainingPlan, todayIso: string): PlanDay[] {
  return plan.days.filter((day) => day.scheduled_for.slice(0, 10) < todayIso && !day.is_completed)
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
  const time = day.scheduled_time ? ` · ${day.scheduled_time}` : ''
  if (day.is_completed) return `День ${day.day_index}${time} · сделано`
  const count = day.exercises.length
  return `День ${day.day_index}${time} · ${count} упр.`
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
