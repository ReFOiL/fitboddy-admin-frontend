import { GUARDIAN_CONSENT_REQUIRED_MESSAGE } from '../src/lib/guardian-consent'
import { buildUpsertProfileRequest, emptyProfileFormValues, profileSchema } from '../src/lib/profile-schema'
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

  it('оставляет минимальный возраст 10', () => {
    expect(profileSchema.safeParse({ ...emptyProfileFormValues, age: 10 }).success).toBe(true)
    expect(profileSchema.safeParse({ ...emptyProfileFormValues, age: 17 }).success).toBe(true)
    const tooYoung = profileSchema.safeParse({ ...emptyProfileFormValues, age: 9 })
    expect(tooYoung.success).toBe(false)
    if (!tooYoung.success) {
      expect(tooYoung.error.issues.some((issue) => issue.message === 'Минимальный возраст — 10')).toBe(true)
    }
  })

  it('не сохраняет анкету младше 18 без согласия представителя и не возвращает текст о здоровье', () => {
    const result = buildUpsertProfileRequest(profile, {
      age: 16,
      limitations: 'травма колена',
      medical_notes: 'астма',
      health_data_consent: true,
      guardian_consent: false,
    })
    expect(result).toEqual({
      ok: false,
      code: 'guardian_consent',
      message: GUARDIAN_CONSENT_REQUIRED_MESSAGE,
    })
    expect(JSON.stringify(result)).not.toContain('травма колена')
    expect(JSON.stringify(result)).not.toContain('астма')
  })

  it('принимает возраст 10 вместе с согласием представителя и не шлёт саму галочку', () => {
    const result = buildUpsertProfileRequest(undefined, {
      age: 10,
      full_name: 'Миша',
      guardian_consent: true,
      health_data_consent: false,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.request).toMatchObject({
        age: 10,
        full_name: 'Миша',
        limitations: null,
        medical_notes: null,
      })
      expect(result.request).not.toHaveProperty('guardian_consent')
      expect(result.request).not.toHaveProperty('health_data_consent')
    }
  })

  it('кладёт здоровье несовершеннолетнего только при обоих согласиях', () => {
    const saved = buildUpsertProfileRequest(profile, {
      age: 16,
      limitations: '  травма колена  ',
      medical_notes: 'астма',
      health_data_consent: true,
      guardian_consent: true,
    })
    expect(saved).toMatchObject({
      ok: true,
      request: {
        age: 16,
        limitations: 'травма колена',
        medical_notes: 'астма',
      },
    })
    if (saved.ok) expect(saved.request).not.toHaveProperty('guardian_consent')

    const blocked = buildUpsertProfileRequest(profile, {
      age: 16,
      limitations: 'травма колена',
      medical_notes: 'астма',
      health_data_consent: false,
      guardian_consent: true,
    })
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.code).toBe('health_data_consent')
    expect(JSON.stringify(blocked)).not.toContain('травма колена')
    expect(JSON.stringify(blocked)).not.toContain('астма')
  })

  it('с 18 лет не требует согласие представителя и сохраняет здоровье по правилам ADM-L02', () => {
    expect(
      buildUpsertProfileRequest(profile, {
        age: 18,
        limitations: 'травма колена',
        medical_notes: 'астма',
        health_data_consent: true,
        guardian_consent: false,
      }),
    ).toMatchObject({
      ok: true,
      request: {
        age: 18,
        limitations: 'травма колена',
        medical_notes: 'астма',
      },
    })
  })

  it('при замене инвентаря несовершеннолетнего не стирает уже сохранённые заметки', () => {
    expect(
      buildUpsertProfileRequest(
        { ...profile, age: 16, limitations: 'травма колена', medical_notes: 'астма' },
        { limitations: 'новое', medical_notes: 'другое', health_data_consent: false, guardian_consent: false },
        { preserveHealthFields: true },
      ),
    ).toMatchObject({
      ok: true,
      request: {
        age: 16,
        limitations: 'травма колена',
        medical_notes: 'астма',
      },
    })
  })
})
