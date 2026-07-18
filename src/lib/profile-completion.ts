import type { ProfileResponse } from '../types/profile'

export function isProfileCompleted(profile: ProfileResponse | undefined): boolean {
  if (!profile) return false
  return (
    profile.age != null &&
    (profile.gender ?? '').trim().length > 0 &&
    (profile.goal ?? '').trim().length > 0 &&
    (profile.experience_level ?? '').trim().length > 0 &&
    (profile.workout_location ?? '').trim().length > 0
  )
}
