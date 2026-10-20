import type { PlanDay, PlanExercise, TrainingPlan } from '../types/plan'

export type DraftSlot = {
  key: string
  exerciseId: string
  exerciseName: string
  sets: number
  reps: number | null
  durationSeconds: number | null
  restSeconds: number | null
  weightKg: number | null
  note: string
}

export type DayDraft = {
  dayIndex: number
  dayId: string
  week: number
  dayOfWeek: number
  scheduledFor: string
  scheduledTime: string | null
  isCompleted: boolean
  slots: DraftSlot[]
}

export type SlotWrite = {
  exercise_id: string
  sets: number | null
  reps: number | null
  duration_seconds: number | null
  rest_seconds: number | null
  weight_kg: number | null
  note: string | null
}

function slotFromExercise(exercise: PlanExercise): DraftSlot {
  return {
    key: exercise.line_id,
    exerciseId: exercise.exercise_id,
    exerciseName: exercise.exercise_name,
    sets: exercise.sets && exercise.sets > 0 ? exercise.sets : 1,
    reps: exercise.reps,
    durationSeconds: exercise.duration_seconds,
    restSeconds: exercise.rest_seconds,
    weightKg: exercise.weight_kg,
    note: exercise.note?.trim() ?? '',
  }
}

export function draftsFromPlan(plan: TrainingPlan): DayDraft[] {
  return [...plan.days]
    .sort((left, right) => left.day_index - right.day_index)
    .map((day) => dayDraftFromPlanDay(day))
}

export function dayDraftFromPlanDay(day: PlanDay): DayDraft {
  return {
    dayIndex: day.day_index,
    dayId: day.day_id,
    week: day.week,
    dayOfWeek: day.day_of_week,
    scheduledFor: day.scheduled_for.slice(0, 10),
    scheduledTime: day.scheduled_time ?? null,
    isCompleted: Boolean(day.is_completed),
    slots: [...day.exercises]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map(slotFromExercise),
  }
}

function slotSignature(slot: DraftSlot): string {
  return [
    slot.exerciseId,
    slot.sets,
    slot.reps ?? '',
    slot.durationSeconds ?? '',
    slot.restSeconds ?? '',
    slot.weightKg ?? '',
    slot.note.trim(),
  ].join(':')
}

export function daySignature(day: DayDraft): string {
  return day.slots.map(slotSignature).join('|')
}

export function isSlotsDirty(baseline: DayDraft, draft: DayDraft): boolean {
  return daySignature(baseline) !== daySignature(draft)
}

export function isTimeDirty(baseline: DayDraft, draft: DayDraft): boolean {
  return (baseline.scheduledTime ?? null) !== (draft.scheduledTime ?? null)
}

export function isDayDirty(baseline: DayDraft, draft: DayDraft): boolean {
  return isSlotsDirty(baseline, draft) || isTimeDirty(baseline, draft)
}

export function dirtyDayIndexes(baseline: DayDraft[], draft: DayDraft[]): number[] {
  const baseByIndex = new Map(baseline.map((day) => [day.dayIndex, day]))
  return draft
    .filter((day) => {
      const original = baseByIndex.get(day.dayIndex)
      return original ? isDayDirty(original, day) : true
    })
    .map((day) => day.dayIndex)
}

export function slotsToWrite(slots: DraftSlot[]): SlotWrite[] {
  return slots.map((slot) => ({
    exercise_id: slot.exerciseId,
    sets: slot.sets,
    reps: slot.reps,
    duration_seconds: slot.durationSeconds,
    rest_seconds: slot.restSeconds,
    weight_kg: slot.weightKg,
    // Пустая заметка на замене дня очищает поле: сервер пишет null, если note нет в теле.
    note: slot.note.trim() ? slot.note.trim() : null,
  }))
}

export function formatDosage(slot: {
  sets?: number | null
  reps?: number | null
  durationSeconds?: number | null
  duration_seconds?: number | null
  weightKg?: number | null
  weight_kg?: number | null
  restSeconds?: number | null
  rest_seconds?: number | null
}): string {
  const sets = slot.sets
  const reps = slot.reps
  const duration = slot.durationSeconds ?? slot.duration_seconds
  const weight = slot.weightKg ?? slot.weight_kg
  const rest = slot.restSeconds ?? slot.rest_seconds
  const parts: string[] = []
  if (sets && sets > 0 && duration && duration > 0) parts.push(`${sets}×${duration} с`)
  else if (sets && sets > 0 && reps && reps > 0) parts.push(`${sets}×${reps}`)
  else if (duration && duration > 0) parts.push(`${duration} с`)
  else if (reps && reps > 0) parts.push(`${reps}`)
  else if (sets && sets > 0) parts.push(`${sets} подх.`)
  if (weight != null && weight > 0) parts.push(`${weight} кг`)
  if (rest != null && rest > 0) {
    const restLabel = rest % 60 === 0 ? `${rest / 60} мин` : `${rest} с`
    parts.push(`отдых ${restLabel}`)
  }
  return parts.length > 0 ? parts.join(' · ') : 'По программе'
}
