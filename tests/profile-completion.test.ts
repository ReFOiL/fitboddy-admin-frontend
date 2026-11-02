import { rememberGuardianConsent } from '../src/lib/guardian-consent'
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
  beforeEach(() => {
    localStorage.clear()
  })

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

  it('считает анкету младше 18 незавершённой без согласия представителя', () => {
    expect(getProfileOnboardingStep(profile({ age: 16 }))).toBeNull()
    expect(isProfileCompleted(profile({ age: 10 }))).toBe(false)
    expect(isProfileCompleted(profile({ age: 16 }))).toBe(false)
    expect(isProfileCompleted(profile({ age: 17 }))).toBe(false)
    rememberGuardianConsent('someone-else', 16, true)
    expect(isProfileCompleted(profile({ age: 16 }))).toBe(false)
  })

  it('считает анкету младше 18 завершённой только после согласия представителя', () => {
    rememberGuardianConsent('user-1', 16, true)
    expect(isProfileCompleted(profile({ age: 16 }))).toBe(true)
    expect(isProfileCompleted(profile({ age: 10 }))).toBe(true)
    expect(isProfileCompleted(profile({ age: 16, goal: ' ' }))).toBe(false)
  })

  it('с 18 лет не требует согласие представителя', () => {
    expect(isProfileCompleted(profile({ age: 18 }))).toBe(true)
    expect(isProfileCompleted(profile({ age: 30 }))).toBe(true)
    rememberGuardianConsent('user-1', 16, true)
    rememberGuardianConsent('user-1', 18, false)
    expect(isProfileCompleted(profile({ age: 16 }))).toBe(false)
    expect(isProfileCompleted(profile({ age: 18 }))).toBe(true)
  })
})
