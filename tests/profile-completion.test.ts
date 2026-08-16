import {
  getProfileOnboardingStep,
  isProfileCompleted,
} from '../src/lib/profile-completion'
import type { ProfileResponse } from '../src/types/profile'

const profile = (overrides: Partial<ProfileResponse> = {}): ProfileResponse => ({
  profile_id: 'profile-1',
  tenant_id: 'tenant-1',
  user_id: 'user-1',
  full_name: null,
  avatar_url: null,
  city: null,
  bio: null,
  age: 30,
  gender: 'male',
  goal: 'strength',
  experience_level: 'beginner',
  workout_location: 'gym',
  unavailable_equipment: [],
  limitations: null,
  medical_notes: null,
  created_at: '2026-08-16T00:00:00Z',
  updated_at: '2026-08-16T00:00:00Z',
  ...overrides,
})

describe('profile-completion', () => {
  it('returns the first incomplete onboarding step', () => {
    expect(getProfileOnboardingStep(undefined)).toBe('age')
    expect(getProfileOnboardingStep(profile({ age: null }))).toBe('age')
    expect(getProfileOnboardingStep(profile({ gender: ' ' }))).toBe('gender')
    expect(getProfileOnboardingStep(profile({ goal: null }))).toBe('goal')
    expect(getProfileOnboardingStep(profile({ experience_level: '' }))).toBe('experience_level')
    expect(getProfileOnboardingStep(profile({ workout_location: null }))).toBe('workout_location')
  })

  it('marks a profile complete when no onboarding step remains', () => {
    expect(getProfileOnboardingStep(profile())).toBeNull()
    expect(isProfileCompleted(profile())).toBe(true)
    expect(isProfileCompleted(profile({ goal: ' ' }))).toBe(false)
  })
})
