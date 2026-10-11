import type { PlanDay, PlanExercise, PlanSlotWrite, TrainingPlan } from '../types/plan'
import type { TrainerExercise } from '../types/exercise'
import { formatPlanDate, formatWeekdayShort } from './plan-formatters'

export type EditorSlot = {
  key: string
  lineId: string | null
  exerciseId: string
  exerciseName: string
  category: string
  isCardio: boolean
  isHold: boolean
  sets: number | null
  reps: number | null
  durationSeconds: number | null
  restSeconds: number | null
  weightKg: number | null
}

export type EditorDay = {
  dayId: string
  dayIndex: number
  week: number
  dayOfWeek: number
  scheduledFor: string
  isCompleted: boolean
  slots: EditorSlot[]
}

const SETS_MIN = 1
const SETS_MAX = 10
const REPS_MIN = 1
const REPS_MAX = 100
const HOLD_MIN = 5
const HOLD_MAX = 3600
const REST_MIN = 0
const REST_MAX = 600

function createKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `slot-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function inferSlotHold(exercise: PlanExercise): boolean {
  return (
    exercise.duration_seconds != null &&
    exercise.duration_seconds > 0 &&
    (exercise.reps == null || exercise.reps <= 0)
  )
}

export function slotFromPlanExercise(exercise: PlanExercise): EditorSlot {
  return {
    key: exercise.line_id,
    lineId: exercise.line_id,
    exerciseId: exercise.exercise_id,
    exerciseName: exercise.exercise_name,
    category: exercise.category,
    isCardio: exercise.is_cardio,
    isHold: inferSlotHold(exercise),
    sets: exercise.sets,
    reps: exercise.reps,
    durationSeconds: exercise.duration_seconds,
    restSeconds: exercise.rest_seconds,
    weightKg: exercise.weight_kg,
  }
}

export function slotFromCatalog(exercise: TrainerExercise): EditorSlot {
  return {
    key: createKey(),
    lineId: null,
    exerciseId: exercise.row_id,
    exerciseName: exercise.exercise_name,
    category: exercise.workout_category,
    isCardio: exercise.is_cardio,
    isHold: exercise.is_hold,
    sets: exercise.default_sets,
    reps: exercise.is_hold ? null : exercise.default_reps,
    durationSeconds: exercise.is_hold ? exercise.default_duration_seconds : null,
    restSeconds: exercise.default_rest_seconds,
    weightKg: exercise.default_weight_kg,
  }
}

export function editorDayFromPlanDay(day: PlanDay): EditorDay {
  return {
    dayId: day.day_id,
    dayIndex: day.day_index,
    week: day.week,
    dayOfWeek: day.day_of_week,
    scheduledFor: day.scheduled_for,
    isCompleted: Boolean(day.is_completed),
    slots: [...day.exercises]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map(slotFromPlanExercise),
  }
}

export function editorDaysFromPlan(plan: TrainingPlan): EditorDay[] {
  return [...plan.days].sort((left, right) => left.day_index - right.day_index).map(editorDayFromPlanDay)
}

export function createEmptyCycle(dayCount: number): EditorDay[] {
  const count = Math.min(7, Math.max(1, Math.trunc(dayCount)))
  return Array.from({ length: count }, (_, index) => ({
    dayId: `new-day-${index + 1}`,
    dayIndex: index + 1,
    week: 1,
    dayOfWeek: -1,
    scheduledFor: '',
    isCompleted: false,
    slots: [],
  }))
}

export function cloneEditorDays(days: EditorDay[]): EditorDay[] {
  return days.map((day) => ({
    ...day,
    slots: day.slots.map((slot) => ({ ...slot })),
  }))
}

export function editorDayLabel(day: EditorDay): string {
  if (!day.scheduledFor) return `День ${day.dayIndex}`
  return `${formatWeekdayShort(day.dayOfWeek)} · ${formatPlanDate(day.scheduledFor)}`
}

export function toPlanSlotWrite(slot: EditorSlot, sortOrder: number): PlanSlotWrite {
  const write: PlanSlotWrite = {
    exercise_id: slot.exerciseId,
    sets: slot.sets,
    reps: slot.isHold ? null : slot.reps,
    duration_seconds: slot.isHold ? slot.durationSeconds : null,
    rest_seconds: slot.restSeconds,
    weight_kg: slot.weightKg,
    sort_order: sortOrder,
  }
  if (slot.lineId) write.line_id = slot.lineId
  return write
}

export function daySlotsPayload(day: EditorDay): PlanSlotWrite[] {
  return day.slots.map((slot, index) => toPlanSlotWrite(slot, index + 1))
}

function slotSignature(slot: EditorSlot, sortOrder: number): string {
  const write = toPlanSlotWrite(slot, sortOrder)
  return [
    write.line_id ?? '',
    write.exercise_id,
    write.sets ?? '',
    write.reps ?? '',
    write.duration_seconds ?? '',
    write.rest_seconds ?? '',
    write.weight_kg ?? '',
    write.sort_order,
  ].join('|')
}

export function editorDaysEqual(left: EditorDay[] | null, right: EditorDay[] | null): boolean {
  if (left === right) return true
  if (!left || !right || left.length !== right.length) return false
  return left.every((day, dayIndex) => {
    const other = right[dayIndex]
    if (!other || day.dayIndex !== other.dayIndex || day.slots.length !== other.slots.length) return false
    return day.slots.every(
      (slot, slotIndex) => slotSignature(slot, slotIndex + 1) === slotSignature(other.slots[slotIndex], slotIndex + 1),
    )
  })
}

export function moveSlot(slots: EditorSlot[], index: number, direction: -1 | 1): EditorSlot[] {
  const nextIndex = index + direction
  if (index < 0 || index >= slots.length || nextIndex < 0 || nextIndex >= slots.length) return slots
  const next = [...slots]
  const current = next[index]
  next[index] = next[nextIndex]
  next[nextIndex] = current
  return next
}

export function replaceDaySlots(days: EditorDay[], dayId: string, slots: EditorSlot[]): EditorDay[] {
  return days.map((day) => (day.dayId === dayId ? { ...day, slots } : day))
}

function isIntegerInRange(value: number | null, min: number, max: number): boolean {
  return value != null && Number.isInteger(value) && value >= min && value <= max
}

export function slotDosageError(slot: EditorSlot): string | null {
  if (!isIntegerInRange(slot.sets, SETS_MIN, SETS_MAX)) {
    return `${slot.exerciseName}: укажите подходы от ${SETS_MIN} до ${SETS_MAX}.`
  }
  if (slot.isHold) {
    if (!isIntegerInRange(slot.durationSeconds, HOLD_MIN, HOLD_MAX)) {
      return `${slot.exerciseName}: укажите удержание от ${HOLD_MIN} до ${HOLD_MAX} сек.`
    }
  } else if (!isIntegerInRange(slot.reps, REPS_MIN, REPS_MAX)) {
    return `${slot.exerciseName}: укажите повторы от ${REPS_MIN} до ${REPS_MAX}.`
  }
  if (slot.restSeconds != null && !isIntegerInRange(slot.restSeconds, REST_MIN, REST_MAX)) {
    return `${slot.exerciseName}: отдых от ${REST_MIN} до ${REST_MAX} сек.`
  }
  if (slot.weightKg != null && (!Number.isFinite(slot.weightKg) || slot.weightKg < 0)) {
    return `${slot.exerciseName}: вес не может быть отрицательным.`
  }
  return null
}

export function firstDosageError(days: EditorDay[]): string | null {
  for (const day of days) {
    for (const slot of day.slots) {
      const error = slotDosageError(slot)
      if (error) return error
    }
  }
  return null
}

export function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

export function sortCatalogForPicker(exercises: TrainerExercise[], trainerUserId: string): TrainerExercise[] {
  return [...exercises].sort((left, right) => {
    const leftOwn = left.trainer_user_id === trainerUserId ? 0 : 1
    const rightOwn = right.trainer_user_id === trainerUserId ? 0 : 1
    if (leftOwn !== rightOwn) return leftOwn - rightOwn
    return left.exercise_name.localeCompare(right.exercise_name, 'ru')
  })
}

export function dirtyDayIndexes(baseline: EditorDay[] | null, draft: EditorDay[]): number[] {
  const baselineByIndex = new Map((baseline ?? []).map((day) => [day.dayIndex, day]))
  return draft
    .filter((day) => {
      const saved = baselineByIndex.get(day.dayIndex) ?? null
      return !editorDaysEqual(saved ? [saved] : [], [day])
    })
    .map((day) => day.dayIndex)
}

export const CATALOG_DRAFT_CONFIRM =
  'Собрать черновик из каталога? Текущие дни и несохранённые правки будут заменены.'

export const FOREIGN_PLAN_SAVE_CONFIRM =
  'Сохранить как ваш план? Текущий план другого источника будет заменён.'
