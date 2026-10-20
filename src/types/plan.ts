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
  note?: string | null
  set_prescriptions: SetPrescription[]
}

export type PlanDay = {
  day_id: string
  day_index: number
  scheduled_for: string
  week: number
  day_of_week: number
  volume_multiplier: number
  scheduled_time?: string | null
  is_completed?: boolean
  completed_at?: string | null
  started_at?: string | null
  finished_at?: string | null
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
  scheduled_time?: string | null
  is_completed: boolean
  completed_at: string | null
  started_at?: string | null
  finished_at?: string | null
  exercises: PlanExercise[]
}

export type PlanSlotWrite = {
  exercise_id: string
  sets?: number | null
  reps?: number | null
  duration_seconds?: number | null
  rest_seconds?: number | null
  weight_kg?: number | null
  note?: string | null
}

export type AddPlanDayRequest = {
  week: number
  day_of_week: number
  scheduled_time?: string | null
}

export type CopyDayMode = 'overwrite' | 'append'

export type CopyPlanDayRequest = {
  week: number
  day_of_week: number
  mode: CopyDayMode
}

export type CopyPlanWeekRequest = {
  target_week: number
  mode: CopyDayMode
}

export type CreateEmptyPlanRequest = {
  goal?: string
  level?: string
  workouts_per_week?: number
  start_date?: string
  day_count?: number
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
