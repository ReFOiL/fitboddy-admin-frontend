import type { ProfileResponse } from '../types/profile'

export const PROFILE_ONBOARDING_STEPS = [
  'age',
  'gender',
  'goal',
  'experience_level',
  'workout_location',
] as const

export type ProfileOnboardingStep = (typeof PROFILE_ONBOARDING_STEPS)[number]

function hasText(value: string | null | undefined): boolean {
  return (value ?? '').trim().length > 0
}

export function getProfileOnboardingStep(
  profile: ProfileResponse | undefined,
): ProfileOnboardingStep | null {
  if (profile?.age == null) return 'age'
  if (!hasText(profile.gender)) return 'gender'
  if (!hasText(profile.goal)) return 'goal'
  if (!hasText(profile.experience_level)) return 'experience_level'
  if (!hasText(profile.workout_location)) return 'workout_location'
  return null
}

export function isProfileCompleted(profile: ProfileResponse | undefined): boolean {
  return getProfileOnboardingStep(profile) === null
}
