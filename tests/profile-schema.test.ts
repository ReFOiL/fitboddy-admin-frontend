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
      ok: true,
      request: {
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
      },
    })
  })

  it('создаёт полный payload для ещё не существующего профиля', () => {
    expect(
      buildUpsertProfileRequest(undefined, {
        full_name: 'Анна',
      }),
    ).toEqual({
      ok: true,
      request: expect.objectContaining({
        full_name: 'Анна',
        age: null,
        goal: null,
        unavailable_equipment: [],
        limitations: null,
        medical_notes: null,
      }),
    })
  })

  it('не кладёт сведения о здоровье в запрос без согласия', () => {
    const result = buildUpsertProfileRequest(profile, {
      limitations: 'травма колена',
      medical_notes: 'астма',
      health_data_consent: false,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toMatch(/согласие/)
      expect(JSON.stringify(result)).not.toContain('травма колена')
      expect(JSON.stringify(result)).not.toContain('астма')
    }
  })

  it('сохраняет сведения о здоровье только вместе с согласием', () => {
    expect(
      buildUpsertProfileRequest(profile, {
        limitations: '  травма колена  ',
        medical_notes: 'астма',
        health_data_consent: true,
      }),
    ).toMatchObject({
      ok: true,
      request: {
        limitations: 'травма колена',
        medical_notes: 'астма',
      },
    })
  })

  it('очищает сведения о здоровье, если согласия нет и поля пустые', () => {
    expect(
      buildUpsertProfileRequest(
        { ...profile, limitations: 'травма колена', medical_notes: 'астма' },
        { limitations: '   ', medical_notes: '', health_data_consent: false, city: 'Казань' },
      ),
    ).toMatchObject({
      ok: true,
      request: {
        city: 'Казань',
        limitations: null,
        medical_notes: null,
      },
    })
  })

  it('при замене профиля не из анкеты здоровья не подменяет уже сохранённый текст', () => {
    expect(
      buildUpsertProfileRequest(
        { ...profile, limitations: 'травма колена', medical_notes: 'астма' },
        { limitations: 'новое', medical_notes: 'другое', health_data_consent: false, city: 'Казань' },
        { preserveHealthFields: true },
      ),
    ).toMatchObject({
      ok: true,
      request: {
        city: 'Казань',
        limitations: 'травма колена',
        medical_notes: 'астма',
      },
    })
  })
})
