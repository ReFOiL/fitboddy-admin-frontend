export type GeneratePlanRequest = {
  trainer_user_id: string
  user_id: string
  goal: string
  level: string
  workout_location: string
  workouts_per_week?: number
  equipment: string[]
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
}

export type PlanDay = {
  day_id: string
  day_index: number
  scheduled_for: string
  week: number
  day_of_week: number
  volume_multiplier: number
  exercises: PlanExercise[]
}

export type TrainingPlan = {
  plan_id: string
  trainer_user_id: string
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
}
