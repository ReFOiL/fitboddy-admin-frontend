import { z } from 'zod'

import type { ProfileResponse, UpsertProfileRequest } from '../types/profile'
import {
  GUARDIAN_CONSENT_REQUIRED_MESSAGE,
  minorMayIncludeHealthFields,
  requiresGuardianConsent,
} from './guardian-consent'
import { healthFieldsForUpsert } from './health-data-consent'

export function isValidAvatarReference(value: string): boolean {
  if (!value) return true
  if (value.startsWith('/api/v1/profiles/media/')) return true
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

export const profileSchema = z.object({
  full_name: z.string().max(120, 'Максимум 120 символов').optional(),
  avatar_url: z
    .string()
    .max(500, 'Максимум 500 символов')
    .refine(isValidAvatarReference, 'Некорректный URL или media-путь')
    .or(z.literal('')),
  city: z.string().max(120, 'Максимум 120 символов').optional(),
  bio: z.string().max(2000, 'Максимум 2000 символов').optional(),
  age: z
    .number({ error: 'Укажите возраст числом' })
    .int('Возраст должен быть целым числом')
    .min(10, 'Минимальный возраст — 10')
    .max(100, 'Максимальный возраст — 100')
    .nullable(),
  gender: z.string().nullable(),
  goal: z.string().nullable(),
  experience_level: z.string().nullable(),
  workout_location: z.string().nullable(),
  limitations: z.string().max(1000, 'Максимум 1000 символов').optional(),
  medical_notes: z.string().max(1000, 'Максимум 1000 символов').optional(),
  health_data_consent: z.boolean(),
  // Только форма. В запрос профиля не входит: отдельного поля API пока нет.
  guardian_consent: z.boolean(),
})

export type ProfileFormValues = z.infer<typeof profileSchema>

export const emptyProfileFormValues: ProfileFormValues = {
  full_name: '',
  avatar_url: '',
  city: '',
  bio: '',
  age: null,
  gender: null,
  goal: null,
  experience_level: null,
  workout_location: null,
  limitations: '',
  medical_notes: '',
  health_data_consent: false,
  guardian_consent: false,
}

export function profileToFormValues(profile?: Partial<ProfileResponse> | null): ProfileFormValues {
  return {
    full_name: typeof profile?.full_name === 'string' ? profile.full_name : '',
    avatar_url: typeof profile?.avatar_url === 'string' ? profile.avatar_url : '',
    city: typeof profile?.city === 'string' ? profile.city : '',
    bio: typeof profile?.bio === 'string' ? profile.bio : '',
    age: typeof profile?.age === 'number' ? profile.age : null,
    gender: typeof profile?.gender === 'string' ? profile.gender : null,
    goal: typeof profile?.goal === 'string' ? profile.goal : null,
    experience_level: typeof profile?.experience_level === 'string' ? profile.experience_level : null,
    workout_location: typeof profile?.workout_location === 'string' ? profile.workout_location : null,
    limitations: typeof profile?.limitations === 'string' ? profile.limitations : '',
    medical_notes: typeof profile?.medical_notes === 'string' ? profile.medical_notes : '',
    // Never pre-check. A stored health note is not a record of consent.
    health_data_consent: false,
    // Не восстанавливаем из профиля: галочка не должна быть включена заранее.
    guardian_consent: false,
  }
}

function nullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export type ProfileUpsertBlockCode = 'guardian_consent' | 'health_data_consent'

export type BuiltProfileUpsert =
  | { ok: true; request: UpsertProfileRequest }
  | { ok: false; code: ProfileUpsertBlockCode; message: string }

type UpsertBlockForm = {
  setError: (
    name: ProfileUpsertBlockCode,
    error: { type: 'manual'; message: string },
  ) => void
  clearErrors: (name: ProfileUpsertBlockCode) => void
}

export function reportProfileUpsertBlock(
  form: UpsertBlockForm,
  block: Extract<BuiltProfileUpsert, { ok: false }>,
): void {
  switch (block.code) {
    case 'guardian_consent':
      form.clearErrors('health_data_consent')
      form.setError('guardian_consent', { type: 'manual', message: block.message })
      return
    case 'health_data_consent':
      form.clearErrors('guardian_consent')
      form.setError('health_data_consent', { type: 'manual', message: block.message })
      return
    default: {
      const unreachable: never = block.code
      return unreachable
    }
  }
}

export function buildUpsertProfileRequest(
  profile: Partial<ProfileResponse> | undefined,
  draft: Partial<ProfileFormValues>,
  options?: { preserveHealthFields?: boolean },
): BuiltProfileUpsert {
  const current = profileToFormValues(profile)
  const merged = { ...current, ...draft }
  const age = merged.age ?? null
  const guardianConsent = merged.guardian_consent === true
  const preserveHealth = options?.preserveHealthFields === true
  const healthAllowed = minorMayIncludeHealthFields(age, guardianConsent)

  // Младше 18 анкету без согласия представителя не сохраняем: текст о здоровье в запрос не попадает.
  // Сохранение инвентаря (preserve) галочку не показывает и профиль заменяет целиком,
  // поэтому уже лежащие заметки там не стираем и не блокируем.
  if (!preserveHealth && requiresGuardianConsent(age) && !guardianConsent) {
    return { ok: false, code: 'guardian_consent', message: GUARDIAN_CONSENT_REQUIRED_MESSAGE }
  }

  const health = healthFieldsForUpsert({
    preserve: preserveHealth,
    consent: merged.health_data_consent === true,
    limitations: merged.limitations,
    medical_notes: merged.medical_notes,
    storedLimitations: typeof profile?.limitations === 'string' ? profile.limitations : null,
    storedMedicalNotes: typeof profile?.medical_notes === 'string' ? profile.medical_notes : null,
  })
  if (!health.ok) return { ok: false, code: 'health_data_consent', message: health.message }

  const healthFields =
    healthAllowed || preserveHealth ? health.fields : { limitations: null, medical_notes: null }

  return {
    ok: true,
    request: {
      full_name: nullableText(merged.full_name),
      city: nullableText(merged.city),
      bio: nullableText(merged.bio),
      age,
      gender: nullableText(merged.gender),
      goal: nullableText(merged.goal),
      experience_level: nullableText(merged.experience_level),
      workout_location: nullableText(merged.workout_location),
      unavailable_equipment: Array.isArray(profile?.unavailable_equipment)
        ? [...profile.unavailable_equipment]
        : [],
      limitations: healthFields.limitations,
      medical_notes: healthFields.medical_notes,
    },
  }
}

export function isKnownProfileOption(
  value: string | null,
  options: Array<{ value: string }>,
): boolean {
  return value === null || options.some((option) => option.value === value)
}
