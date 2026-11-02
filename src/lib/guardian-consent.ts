export const ADULT_AGE = 18

export const GUARDIAN_CONSENT_REQUIRED_MESSAGE =
  'Для возраста младше 18 нужно согласие законного представителя.'

export const GUARDIAN_CONSENT_STORAGE_PREFIX = 'fitboddy:guardian-consent:'

export function requiresGuardianConsent(age: number | null | undefined): boolean {
  return typeof age === 'number' && Number.isFinite(age) && age < ADULT_AGE
}

export function guardianConsentBlockMessage(input: {
  age: number | null | undefined
  consent: boolean
}): string | null {
  if (!requiresGuardianConsent(input.age) || input.consent) return null
  return GUARDIAN_CONSENT_REQUIRED_MESSAGE
}

/**
 * Младше 18 сведения о здоровье уходят в запрос только вместе с согласием представителя.
 * Согласие на сами заметки этого не заменяет.
 */
export function minorMayIncludeHealthFields(
  age: number | null | undefined,
  guardianConsent: boolean,
): boolean {
  return !requiresGuardianConsent(age) || guardianConsent
}

function storageKey(userId: string): string {
  return `${GUARDIAN_CONSENT_STORAGE_PREFIX}${userId}`
}

export function readGuardianConsent(userId: string | null | undefined): boolean {
  if (!userId) return false
  try {
    return localStorage.getItem(storageKey(userId)) === '1'
  } catch {
    return false
  }
}

/**
 * Запоминает согласие только в этом браузере. Поля API для него нет.
 * Для 18+ запись снимается, чтобы снижение возраста снова требовало галочку.
 */
export function rememberGuardianConsent(
  userId: string | null | undefined,
  age: number | null | undefined,
  consent: boolean,
): void {
  if (!userId) return
  try {
    if (requiresGuardianConsent(age) && consent) localStorage.setItem(storageKey(userId), '1')
    else localStorage.removeItem(storageKey(userId))
  } catch {
    // Приватный режим: без записи анкета несовершеннолетнего останется незавершённой.
  }
}
