import { z } from 'zod'

import type { ProfileResponse, UpsertProfileRequest } from '../types/profile'

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
    .number({ error: 'Укажи возраст числом' })
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
  }
}

function nullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function buildUpsertProfileRequest(
  profile: Partial<ProfileResponse> | undefined,
  draft: Partial<ProfileFormValues>,
): UpsertProfileRequest {
  const current = profileToFormValues(profile)
  const merged = { ...current, ...draft }

  return {
    full_name: nullableText(merged.full_name),
    city: nullableText(merged.city),
    bio: nullableText(merged.bio),
    age: merged.age ?? null,
    gender: nullableText(merged.gender),
    goal: nullableText(merged.goal),
    experience_level: nullableText(merged.experience_level),
    workout_location: nullableText(merged.workout_location),
    unavailable_equipment: Array.isArray(profile?.unavailable_equipment)
      ? [...profile.unavailable_equipment]
      : [],
    limitations: nullableText(merged.limitations),
    medical_notes: nullableText(merged.medical_notes),
  }
}

export function isKnownProfileOption(
  value: string | null,
  options: Array<{ value: string }>,
): boolean {
  return value === null || options.some((option) => option.value === value)
}
