export type TrainerExercise = {
  row_id: string
  trainer_user_id: string
  exercise_name: string
  description: string | null
  equipment: string
  is_cardio: boolean
  difficulty: number
  workout_category: string
  is_active: boolean
  video_url: string | null
  created_at: string
  updated_at: string
}

export type UpsertTrainerExerciseRequest = {
  exercise_name: string
  description?: string | null
  equipment: string
  is_cardio: boolean
  difficulty: number
  workout_category: string
}

export type ExerciseVideoUploadResponse = {
  trainer_user_id: string
  row_id: string
  video_url: string
}
