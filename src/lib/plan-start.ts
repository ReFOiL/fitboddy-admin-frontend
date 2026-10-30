import { addIsoDays, formatMonthDay, parseIsoDate } from './dates'
import { formatWeekdayShort } from './plan-formatters'
import type { PlanStartMode, SetPlanStartRequest } from '../types/plan'

/** Trainer's choice in «Когда начать». `date` is set only for the date option. */
export type PlanStartChoice =
  | { mode: 'next_workout' }
  | { mode: 'next_monday' }
  | { mode: 'date'; date: string | null }

type StartDay = {
  week: number
  scheduledFor: string
  exerciseCount: number
  isCompleted?: boolean
}

export function mondayBasedWeekday(iso: string): number | null {
  const date = parseIsoDate(iso)
  if (!date) return null
  const jsDay = date.getDay()
  return jsDay === 0 ? 6 : jsDay - 1
}

/** «Пн, 3 ноя» */
export function formatPlanStartSubtitle(iso: string): string {
  const weekday = mondayBasedWeekday(iso)
  if (weekday == null) return iso
  return `${formatWeekdayShort(weekday)}, ${formatMonthDay(iso)}`
}

/** Next date on or after today whose weekday is one of the plan's slots. Monday is 0. */
export function nextWorkoutDate(dayOfWeeks: readonly number[], todayIso: string): string | null {
  const todayWeekday = mondayBasedWeekday(todayIso)
  if (todayWeekday == null) return null
  const weekdays = [...new Set(dayOfWeeks.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
  if (weekdays.length === 0) return null
  let best: string | null = null
  for (const weekday of weekdays) {
    const ahead = (weekday - todayWeekday + 7) % 7
    const candidate = addIsoDays(todayIso, ahead)
    if (best == null || candidate < best) best = candidate
  }
  return best
}

/** Monday that opens the next calendar week. Today being Monday means seven days ahead. */
export function nextWeekMonday(todayIso: string): string | null {
  const weekday = mondayBasedWeekday(todayIso)
  if (weekday == null) return null
  const daysAhead = weekday === 0 ? 7 : 7 - weekday
  return addIsoDays(todayIso, daysAhead)
}

/**
 * True when both anchors are the same calendar day.
 * Plan-service does this on purpose: Sat/Sun with a Monday slot is that Monday.
 */
export function planStartAnchorsCoincide(dayOfWeeks: readonly number[], todayIso: string): boolean {
  const workout = nextWorkoutDate(dayOfWeeks, todayIso)
  const monday = nextWeekMonday(todayIso)
  return workout != null && monday != null && workout === monday
}

/**
 * Hide «С понедельника следующей недели» when it would repeat the nearest workout,
 * either as the same date or as the same subtitle.
 */
export function nextMondayOptionRepeatsWorkout(dayOfWeeks: readonly number[], todayIso: string): boolean {
  const workout = nextWorkoutDate(dayOfWeeks, todayIso)
  const monday = nextWeekMonday(todayIso)
  if (!workout || !monday) return false
  if (workout === monday) return true
  return formatPlanStartSubtitle(workout) === formatPlanStartSubtitle(monday)
}

/** Nearest workout replaces next Monday while that option would repeat it. */
export function planStartChoiceForSlots(
  choice: PlanStartChoice,
  dayOfWeeks: readonly number[],
  todayIso: string,
): PlanStartChoice {
  if (choice.mode === 'next_monday' && nextMondayOptionRepeatsWorkout(dayOfWeeks, todayIso)) {
    return { mode: 'next_workout' }
  }
  return choice
}

export function planStartChoiceFromPlan(plan: {
  start_mode?: PlanStartMode | null
  start_date?: string | null
}): PlanStartChoice {
  const mode = plan.start_mode
  if (mode !== 'next_workout' && mode !== 'next_monday' && mode !== 'date') {
    return { mode: 'next_workout' }
  }
  switch (mode) {
    case 'next_workout':
      return { mode: 'next_workout' }
    case 'next_monday':
      return { mode: 'next_monday' }
    case 'date':
      return { mode: 'date', date: plan.start_date ? plan.start_date.slice(0, 10) : null }
    default: {
      const unreachable: never = mode
      return unreachable
    }
  }
}

export function isSamePlanStartChoice(left: PlanStartChoice, right: PlanStartChoice): boolean {
  switch (left.mode) {
    case 'next_workout':
    case 'next_monday':
      return right.mode === left.mode
    case 'date':
      return right.mode === 'date' && left.date === right.date
    default: {
      const unreachable: never = left
      return unreachable
    }
  }
}

/** Payload for the save. `null` until «С даты…» has a date. */
export function planStartRequest(
  choice: PlanStartChoice,
  dayOfWeeks: readonly number[],
  todayIso: string,
): SetPlanStartRequest | null {
  const resolved = planStartChoiceForSlots(choice, dayOfWeeks, todayIso)
  switch (resolved.mode) {
    case 'next_workout':
      return { start_mode: 'next_workout', start_date: nextWorkoutDate(dayOfWeeks, todayIso) }
    case 'next_monday':
      return { start_mode: 'next_monday', start_date: nextWeekMonday(todayIso) }
    case 'date':
      if (!resolved.date) return null
      return { start_mode: 'date', start_date: resolved.date }
    default: {
      const unreachable: never = resolved
      return unreachable
    }
  }
}

/**
 * Empty week-1 day that falls before the plan start.
 * These are lead-in gaps, not skipped workouts, and are left out of the week strip.
 */
export function isEmptyLeadInDay(day: StartDay, startIso: string | null | undefined): boolean {
  if (!startIso || day.week !== 1 || day.exerciseCount > 0) return false
  return day.scheduledFor.slice(0, 10) < startIso.slice(0, 10)
}

/** A past unfinished day on or after the plan start. Lead-in days before the start are not skipped. */
export function isSkippedWorkout(day: StartDay, todayIso: string, startIso: string | null | undefined): boolean {
  if (day.isCompleted) return false
  const scheduled = day.scheduledFor.slice(0, 10)
  const start = startIso?.slice(0, 10) ?? null
  if (start && scheduled < start) return false
  if (isEmptyLeadInDay(day, start)) return false
  return scheduled < todayIso
}
