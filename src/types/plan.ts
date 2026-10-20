export type PlanSource = 'trainer' | 'system'

export type GeneratePlanRequest = {
  source?: PlanSource
  trainer_user_id?: string | null
  user_id: string
  goal: string
  level: string
  workout_location: string
  workouts_per_week?: number
  unavailable_equipment: string[]
}

export type SetPrescription = {
  set_index: number
  reps: number | null
  duration_seconds: number | null
  weight_kg: number | null
  rest_seconds: number | null
}

export type PlanExercise = {
  line_id: string
  exercise_id: string
  exercise_name: string
  category: string
  is_cardio: boolean
  sort_order: number
  sets: number | null
  reps: number | null
  duration_seconds: number | null
  rest_seconds: number | null
  weight_kg: number | null
  set_prescriptions: SetPrescription[]
}

export type PlanDay = {
  day_id: string
  day_index: number
  scheduled_for: string
  week: number
  day_of_week: number
  volume_multiplier: number
  is_completed?: boolean
  completed_at?: string | null
  exercises: PlanExercise[]
}

export type TodayWorkout = {
  plan_id: string
  source: PlanSource
  trainer_user_id: string | null
  day_id: string
  day_index: number
  scheduled_for: string
  week: number
  day_of_week: number
  volume_multiplier: number
  is_completed: boolean
  completed_at: string | null
  exercises: PlanExercise[]
}

export type TrainingPlan = {
  plan_id: string
  source: PlanSource
  trainer_user_id: string | null
  user_id: string
  status: string
  goal: string
  level: string
  workouts_per_week: number
  start_date: string
  end_date: string
  created_at: string
  updated_at: string
  days: PlanDay[]
  previous_adherence?: number | null
}

/**
 * Dosage for a new or replaced slot.
 * `exercise_id` is trainer_exercises.row_id.
 * Omitted dosage fields copy the trainer exercise defaults.
 * Hold slots send `duration_seconds` and omit `reps`. Rep slots do the reverse.
 * Name, category, and hold mode are snapshotted by the server. Do not send line_id or sort_order.
 */
export type PlanSlotWrite = {
  exercise_id: string
  sets?: number | null
  reps?: number | null
  duration_seconds?: number | null
  rest_seconds?: number | null
  weight_kg?: number | null
}

export type ReplaceDaySlotsRequest = {
  slots: PlanSlotWrite[]
}

export type AddPlanSlotRequest = PlanSlotWrite

/** Partial dosage. Omitted fields stay. Explicit `weight_kg: null` clears weight. */
export type UpdatePlanSlotRequest = {
  sets?: number | null
  reps?: number | null
  duration_seconds?: number | null
  rest_seconds?: number | null
  weight_kg?: number | null
}

export type ReorderPlanSlotsRequest = {
  line_ids: string[]
}

/** Creates an empty trainer plan. 409 when the client already has an active plan. */
export type CreateEmptyPlanRequest = {
  goal: string
  level: string
  workouts_per_week: number
  day_count: number
  start_date?: string | null
}
