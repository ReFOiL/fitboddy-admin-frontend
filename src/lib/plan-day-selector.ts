import type { PlanDay, TodayWorkout, TrainingPlan } from '../types/plan'

export type PlanDaySelection =
  | {
      kind: 'no-plan'
      day: null
      focusedDayId: null
      isToday: false
      sortedDays: PlanDay[]
      weekDays: PlanDay[]
    }
  | {
      kind: 'rest'
      day: null
      focusedDayId: null
      isToday: false
      sortedDays: PlanDay[]
      weekDays: PlanDay[]
    }
  | {
      kind: 'workout'
      day: PlanDay
      focusedDayId: string
      isToday: boolean
      sortedDays: PlanDay[]
      weekDays: PlanDay[]
    }

type SelectPlanDayInput = {
  plan: Pick<TrainingPlan, 'days'> | null | undefined
  todayIso: string
  selectedDayId?: string | null
  todayWorkout?: Pick<TodayWorkout, 'week'> | null
}

export function selectPlanDay({
  plan,
  todayIso,
  selectedDayId = null,
  todayWorkout,
}: SelectPlanDayInput): PlanDaySelection {
  if (!plan) {
    return {
      kind: 'no-plan',
      day: null,
      focusedDayId: null,
      isToday: false,
      sortedDays: [],
      weekDays: [],
    }
  }

  const sortedDays = [...plan.days].sort((left, right) => {
    if (left.week !== right.week) return left.week - right.week
    return left.day_index - right.day_index
  })
  const todayDay = sortedDays.find((day) => day.scheduled_for === todayIso)
  const day = selectedDayId
    ? sortedDays.find((candidate) => candidate.day_id === selectedDayId) ?? null
    : todayDay ?? null
  const visibleWeek = todayDay?.week ?? todayWorkout?.week ?? sortedDays[0]?.week
  const weekDays = visibleWeek == null ? [] : sortedDays.filter((candidate) => candidate.week === visibleWeek)

  if (!day) {
    return {
      kind: 'rest',
      day: null,
      focusedDayId: null,
      isToday: false,
      sortedDays,
      weekDays,
    }
  }

  return {
    kind: 'workout',
    day,
    focusedDayId: day.day_id,
    isToday: day.scheduled_for === todayIso,
    sortedDays,
    weekDays,
  }
}
