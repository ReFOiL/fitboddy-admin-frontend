export const HEALTH_DATA_CONSENT_LABEL =
  'Соглашаюсь на обработку ограничений и медицинских заметок и показ их тренеру'

export const HEALTH_DATA_CONSENT_REQUIRED_MESSAGE = 'Отметьте согласие или очистите поля.'

export const TRAINER_HEALTH_PRIVATE_MESSAGE = 'Не показано без согласия'

export const TRAINER_HEALTH_EMPTY_MESSAGE = 'Не указано'

export function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function hasHealthText(limitations?: string | null, medicalNotes?: string | null): boolean {
  return Boolean(blankToNull(limitations) || blankToNull(medicalNotes))
}

export function healthDataConsentBlockMessage(input: {
  consent: boolean
  limitations?: string | null
  medical_notes?: string | null
}): string | null {
  if (input.consent || !hasHealthText(input.limitations, input.medical_notes)) return null
  return HEALTH_DATA_CONSENT_REQUIRED_MESSAGE
}

export type StoredHealthFields = {
  limitations: string | null
  medical_notes: string | null
}

/**
 * Client-side gate until the profile API stores a consent record (AUTH-003 / PROF-02).
 * preserve keeps already stored values on a full replace that is not a health edit.
 * A health edit without consent and with typed text fails instead of dropping the text.
 */
export function healthFieldsForUpsert(input: {
  preserve: boolean
  consent: boolean
  limitations?: string | null
  medical_notes?: string | null
  storedLimitations?: string | null
  storedMedicalNotes?: string | null
}): { ok: true; fields: StoredHealthFields } | { ok: false; message: string } {
  if (input.preserve) {
    return {
      ok: true,
      fields: {
        limitations: blankToNull(input.storedLimitations),
        medical_notes: blankToNull(input.storedMedicalNotes),
      },
    }
  }

  const message = healthDataConsentBlockMessage({
    consent: input.consent,
    limitations: input.limitations,
    medical_notes: input.medical_notes,
  })
  if (message) return { ok: false, message }

  if (!input.consent) {
    return { ok: true, fields: { limitations: null, medical_notes: null } }
  }

  return {
    ok: true,
    fields: {
      limitations: blankToNull(input.limitations),
      medical_notes: blankToNull(input.medical_notes),
    },
  }
}

export type TrainerHealthProfile = {
  limitations?: string | null
  medical_notes?: string | null
  /**
   * Read only. The profile API does not return this yet.
   * Missing or false means the trainer must not see health text.
   */
  health_data_consent?: boolean | null
}

export type TrainerHealthVisibility =
  | { status: 'private'; message: string }
  | { status: 'empty'; message: string }
  | { status: 'shared'; limitations: string | null; medicalNotes: string | null }

export function trainerVisibleHealth(
  profile: TrainerHealthProfile | null | undefined,
): TrainerHealthVisibility {
  if (profile?.health_data_consent !== true) {
    return { status: 'private', message: TRAINER_HEALTH_PRIVATE_MESSAGE }
  }

  const limitations = blankToNull(profile.limitations)
  const medicalNotes = blankToNull(profile.medical_notes)
  if (!limitations && !medicalNotes) {
    return { status: 'empty', message: TRAINER_HEALTH_EMPTY_MESSAGE }
  }

  return { status: 'shared', limitations, medicalNotes }
}
