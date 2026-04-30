export type TrainerExercise = {
  row_id: string
  trainer_user_id: string
  exercise_id: string
  exercise_name: string
  equipment: string
  is_cardio: boolean
  difficulty: number
  workout_category: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type UpsertTrainerExerciseRequest = {
  exercise_name: string
  equipment: string
  is_cardio: boolean
  difficulty: number
  workout_category: string
}
