export type SessionSizeBounds = {
  min: number
  max: number
}

export type GenerationPolicy = {
  excluded_pairs: string[][]
  default_splits: Record<string, string[]>
  default_workouts_per_week: Record<string, number>
  exercises_per_session: Record<string, SessionSizeBounds>
}
