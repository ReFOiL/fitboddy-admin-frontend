export type LoadScheme = 'flat' | 'ascending' | 'descending' | 'custom'

export type TrainerExercise = {
  row_id: string
  trainer_user_id: string
  exercise_name: string
  description: string | null
  equipment: string
  is_cardio: boolean
  is_hold: boolean
  difficulty: number
  workout_category: string
  default_sets: number
  default_reps: number | null
  default_duration_seconds: number | null
  default_rest_seconds: number
  default_weight_kg: number | null
  load_scheme: LoadScheme
  scheme_steps: number[]
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
  is_hold: boolean
  difficulty: number
  workout_category: string
  default_sets: number
  default_reps: number | null
  default_duration_seconds: number | null
  default_rest_seconds: number
  default_weight_kg: number | null
  load_scheme: LoadScheme
  scheme_steps: number[]
}

export type ExerciseVideoUploadResponse = {
  trainer_user_id: string
  row_id: string
  video_url: string
}

export type ExerciseLoadScope = 'trainer' | 'platform'

export type ClientExerciseLoad = {
  load_id: string
  client_user_id: string
  exercise_scope: ExerciseLoadScope
  trainer_user_id: string | null
  exercise_row_id: string
  working_weight_kg: number
  updated_at: string
}

export type PlatformExercise = {
  row_id: string
  catalog_key: string | null
  exercise_name: string
  description: string | null
  equipment: string
  is_cardio: boolean
  is_hold: boolean
  difficulty: number
  workout_category: string
  default_sets: number
  default_reps: number | null
  default_duration_seconds: number | null
  default_rest_seconds: number
  default_weight_kg: number | null
  load_scheme: LoadScheme
  scheme_steps: number[]
  is_active: boolean
  video_url: string | null
  created_at: string
  updated_at: string
}

export type UpsertClientLoadRequest = {
  working_weight_kg: number
}
