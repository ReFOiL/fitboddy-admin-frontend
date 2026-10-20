import {
  clientSystemGenerateBlockReason,
  trainerCatalogGenerateBlockReason,
} from '../src/lib/plan-generate-reason'
import type { ProfileResponse } from '../src/types/profile'

function profile(partial: Partial<ProfileResponse>): ProfileResponse {
  return {
    profile_id: 'profile-1',
    tenant_id: 'tenant-1',
    user_id: 'user-1',
    full_name: null,
    avatar_url: null,
    city: null,
    bio: null,
    age: 30,
    gender: 'female',
    goal: 'maintenance',
    experience_level: 'beginner',
    workout_location: 'gym',
    unavailable_equipment: [],
    limitations: null,
    medical_notes: null,
    created_at: '',
    updated_at: '',
    ...partial,
  }
}

describe('plan generate reasons', () => {
  it('names the missing questionnaire field for a trainer catalog build', () => {
    expect(
      trainerCatalogGenerateBlockReason({
        isPending: false,
        profile: profile({ experience_level: '' }),
        profileLoading: false,
        profileMissing: false,
      }),
    ).toBe('Собрать из каталога нельзя: в анкете не указан уровень.')
  })

  it('explains a missing client profile and a relation check', () => {
    expect(
      trainerCatalogGenerateBlockReason({
        isPending: false,
        profile: undefined,
        profileLoading: false,
        profileMissing: true,
      }),
    ).toBe('Собрать из каталога нельзя: клиент ещё не заполнил анкету.')

    expect(
      clientSystemGenerateBlockReason({
        isPending: false,
        profile: profile({}),
        profileLoading: false,
        relationLoading: true,
        hasActiveTrainer: false,
      }),
    ).toBe('Проверяем связь с тренером…')
  })

  it('stays quiet while a request is already running or a trainer owns the plan', () => {
    expect(
      clientSystemGenerateBlockReason({
        isPending: true,
        profile: profile({}),
        profileLoading: false,
        relationLoading: false,
        hasActiveTrainer: false,
      }),
    ).toBeNull()
    expect(
      trainerCatalogGenerateBlockReason({
        isPending: false,
        profile: profile({}),
        profileLoading: false,
        profileMissing: false,
      }),
    ).toBeNull()
  })
})
