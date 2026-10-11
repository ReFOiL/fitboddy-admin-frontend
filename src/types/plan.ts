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
 * Write shape for one ordered slot.
 * `exercise_id` is the catalog row id (same field as PlanExercise.exercise_id).
 * Hold exercises use `duration_seconds` and leave `reps` empty — plan rows have no is_hold flag.
 * `set_prescriptions` stay server-owned: the API rebuilds them from this dosage.
 */
export type PlanSlotWrite = {
  line_id?: string
  exercise_id: string
  sets: number | null
  reps: number | null
  duration_seconds: number | null
  rest_seconds: number | null
  weight_kg: number | null
  sort_order: number
}

export type ReplaceDaySlotsRequest = {
  slots: PlanSlotWrite[]
}

export type AddPlanSlotRequest = Omit<PlanSlotWrite, 'line_id'>

export type UpdatePlanSlotRequest = Omit<PlanSlotWrite, 'line_id' | 'sort_order'>

export type ReorderPlanSlotsRequest = {
  line_ids: string[]
}

export type ManualPlanDayWrite = {
  day_index: number
  slots: PlanSlotWrite[]
}

export type CreateManualPlanRequest = GeneratePlanRequest & {
  days: ManualPlanDayWrite[]
}
