import { formatWeekday, formatWeekdayShort } from './plan-formatters'
import type { PlanWeekdayOutcome } from '../types/plan'

/** Monday is 0, Sunday is 6. Matches plan-service. */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const

export type WeekdayKind = 'current' | 'free' | 'occupied'

export type WeekdaySlot = {
  dayOfWeek: number
  kind: WeekdayKind
  /** The other plan day when this weekday is already taken in the same week. */
  dayIndex: number | null
}

type WeekDayRef = {
  dayIndex: number
  dayOfWeek: number
}

/** One row per weekday. Occupied means another day in this week already uses it. */
export function weekdaySlots(weekDays: readonly WeekDayRef[], selectedDayOfWeek: number): WeekdaySlot[] {
  return WEEKDAYS.map((dayOfWeek) => {
    if (dayOfWeek === selectedDayOfWeek) {
      return { dayOfWeek, kind: 'current', dayIndex: null }
    }
    const occupied = weekDays.find((day) => day.dayOfWeek === dayOfWeek)
    if (occupied) {
      return { dayOfWeek, kind: 'occupied', dayIndex: occupied.dayIndex }
    }
    return { dayOfWeek, kind: 'free', dayIndex: null }
  })
}

export function weekdayChoiceLabel(slot: WeekdaySlot): string {
  const name = formatWeekday(slot.dayOfWeek)
  switch (slot.kind) {
    case 'current':
      return `${name}, выбран`
    case 'free':
      return `${name}, свободен`
    case 'occupied':
      return `${name}, занят`
    default: {
      const unreachable: never = slot.kind
      return unreachable
    }
  }
}

export function weekdayOutcomeMessage(outcome: PlanWeekdayOutcome): string {
  switch (outcome) {
    case 'set':
      return 'День недели изменён'
    case 'swap':
      return 'Дни поменялись местами'
    default: {
      const unreachable: never = outcome
      return unreachable
    }
  }
}

/** «Пн ↔ Ср», earlier weekday first. */
export function weekdaySwapTitle(fromDayOfWeek: number, toDayOfWeek: number): string {
  const [left, right] = fromDayOfWeek < toDayOfWeek ? [fromDayOfWeek, toDayOfWeek] : [toDayOfWeek, fromDayOfWeek]
  return `${formatWeekdayShort(left)} ↔ ${formatWeekdayShort(right)}`
}
