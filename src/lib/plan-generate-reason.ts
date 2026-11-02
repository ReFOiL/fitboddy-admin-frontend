import type { ProfileResponse } from '../types/profile'
import { GUARDIAN_CONSENT_REQUIRED_MESSAGE } from './guardian-consent'
import { getProfileOnboardingStep, profileLacksGuardianConsent, type ProfileOnboardingStep } from './profile-completion'

const PROFILE_STEP_LABEL: Record<ProfileOnboardingStep, string> = {
  age: 'возраст',
  gender: 'пол',
  goal: 'цель',
  experience_level: 'уровень',
  workout_location: 'место тренировок',
}

function missingProfileReason(profile: ProfileResponse | undefined, prefix: string): string | null {
  const step = getProfileOnboardingStep(profile)
  if (step) return `${prefix}: в анкете не указан ${PROFILE_STEP_LABEL[step]}.`
  if (profileLacksGuardianConsent(profile)) return GUARDIAN_CONSENT_REQUIRED_MESSAGE
  return null
}

export function clientSystemGenerateBlockReason(input: {
  isPending: boolean
  profile: ProfileResponse | undefined
  profileLoading: boolean
  relationLoading: boolean
  hasActiveTrainer: boolean
}): string | null {
  if (input.isPending || input.hasActiveTrainer) return null
  if (input.profileLoading) return 'Загружаем анкету…'
  const missing = missingProfileReason(input.profile, 'Собрать план нельзя')
  if (missing) return missing
  if (input.relationLoading) return 'Проверяем связь с тренером…'
  return null
}

export function trainerCatalogGenerateBlockReason(input: {
  isPending: boolean
  profile: ProfileResponse | undefined
  profileLoading: boolean
  profileMissing: boolean
}): string | null {
  if (input.isPending) return null
  if (input.profileLoading) return 'Загружаем анкету клиента…'
  if (input.profileMissing) return 'Собрать из каталога нельзя: клиент ещё не заполнил анкету.'
  return missingProfileReason(input.profile, 'Собрать из каталога нельзя')
}
