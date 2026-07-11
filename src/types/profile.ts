export type UpsertProfileRequest = {
  full_name: string | null
  city: string | null
  bio: string | null
  goal: string | null
  experience_level: string | null
  workout_location: string | null
  unavailable_equipment: string[]
  limitations: string | null
  medical_notes: string | null
}

export type ProfileResponse = {
  profile_id: string
  tenant_id: string
  user_id: string
  full_name: string | null
  avatar_url: string | null
  city: string | null
  bio: string | null
  goal: string | null
  experience_level: string | null
  workout_location: string | null
  unavailable_equipment: string[]
  limitations: string | null
  medical_notes: string | null
  created_at: string
  updated_at: string
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
  equipment: ProfileMetaOption[]
}
