import { buildUpsertProfileRequest } from '../src/lib/profile-schema'
import type { ProfileResponse } from '../src/types/profile'

const profile: ProfileResponse = {
  profile_id: 'profile-1',
  tenant_id: 'tenant-1',
  user_id: 'client-1',
  full_name: 'Старое имя',
  avatar_url: null,
  city: 'Москва',
  bio: null,
  age: 30,
  gender: 'male',
  goal: 'maintenance',
  experience_level: 'beginner',
  workout_location: 'home',
  unavailable_equipment: ['barbell', 'bench'],
  limitations: null,
  medical_notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('profile payload helpers', () => {
  it('мерджит draft в полный payload и сохраняет unavailable_equipment', () => {
    expect(
      buildUpsertProfileRequest(profile, {
        full_name: '  Новое имя  ',
        goal: 'strength',
      }),
    ).toEqual({
      full_name: 'Новое имя',
      city: 'Москва',
      bio: null,
      age: 30,
      gender: 'male',
      goal: 'strength',
      experience_level: 'beginner',
      workout_location: 'home',
      unavailable_equipment: ['barbell', 'bench'],
      limitations: null,
      medical_notes: null,
    })
  })

  it('создаёт полный payload для ещё не существующего профиля', () => {
    expect(
      buildUpsertProfileRequest(undefined, {
        full_name: 'Анна',
      }),
    ).toMatchObject({
      full_name: 'Анна',
      age: null,
      goal: null,
      unavailable_equipment: [],
    })
  })
})
