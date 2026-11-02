export type UpsertProfileRequest = {
  full_name: string | null
  city: string | null
  bio: string | null
  age: number | null
  gender: string | null
  goal: string | null
  experience_level: string | null
  workout_location: string | null
  unavailable_equipment: string[]
  limitations: string | null
  medical_notes: string | null
}

export type ProfileDraftRequest = Partial<UpsertProfileRequest>

export type ProfileResponse = {
  profile_id: string
  tenant_id: string
  user_id: string
  full_name: string | null
  avatar_url: string | null
  city: string | null
  bio: string | null
  age: number | null
  gender: string | null
  goal: string | null
  experience_level: string | null
  workout_location: string | null
  unavailable_equipment: string[]
  limitations: string | null
  medical_notes: string | null
  /**
   * Separate consent to process limitations / medical_notes and show them to the
   * bound trainer. Not part of the current profile API (AUTH-003 / PROF-02).
   * Absence means the trainer UI must hide health text.
   */
  health_data_consent?: boolean | null
  created_at: string
  updated_at: string
}

export type TrainerProfilePreview = {
  user_id: string
  full_name: string | null
  avatar_url: string | null
  city: string | null
  bio: string | null
}

export type AvatarUploadResponse = {
  user_id: string
  avatar_url: string
}

export type ProfileMetaOption = {
  value: string
  label: string
}

export type ProfileMetaResponse = {
  goals: ProfileMetaOption[]
  levels: ProfileMetaOption[]
  workout_locations: ProfileMetaOption[]
  genders: ProfileMetaOption[]
  equipment: ProfileMetaOption[]
}
