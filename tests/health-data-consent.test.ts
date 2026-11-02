import {
  HEALTH_DATA_CONSENT_REQUIRED_MESSAGE,
  TRAINER_HEALTH_EMPTY_MESSAGE,
  TRAINER_HEALTH_PRIVATE_MESSAGE,
  healthDataConsentBlockMessage,
  healthFieldsForUpsert,
  trainerVisibleHealth,
} from '../src/lib/health-data-consent'

describe('health data consent gate', () => {
  it('блокирует текст без согласия и не возвращает его', () => {
    expect(
      healthDataConsentBlockMessage({
        consent: false,
        limitations: ' травма колена ',
        medical_notes: '',
      }),
    ).toBe(HEALTH_DATA_CONSENT_REQUIRED_MESSAGE)

    const saved = healthFieldsForUpsert({
      preserve: false,
      consent: false,
      limitations: 'травма колена',
      medical_notes: 'астма',
    })
    expect(saved.ok).toBe(false)
    expect(JSON.stringify(saved)).not.toContain('травма колена')
    expect(JSON.stringify(saved)).not.toContain('астма')
  })

  it('пропускает пустые поля без согласия и очищает их', () => {
    expect(healthDataConsentBlockMessage({ consent: false, limitations: '  ', medical_notes: null })).toBeNull()
    expect(
      healthFieldsForUpsert({
        preserve: false,
        consent: false,
        limitations: ' ',
        medical_notes: '',
        storedLimitations: 'старое',
        storedMedicalNotes: 'старое',
      }),
    ).toEqual({ ok: true, fields: { limitations: null, medical_notes: null } })
  })

  it('сохраняет текст только при согласии', () => {
    expect(
      healthFieldsForUpsert({
        preserve: false,
        consent: true,
        limitations: ' травма колена ',
        medical_notes: '  ',
      }),
    ).toEqual({ ok: true, fields: { limitations: 'травма колена', medical_notes: null } })
  })

  it('показывает тренеру текст только при явном согласии', () => {
    const hidden = trainerVisibleHealth({
      limitations: 'травма колена',
      medical_notes: 'астма',
    })
    expect(hidden).toEqual({ status: 'private', message: TRAINER_HEALTH_PRIVATE_MESSAGE })
    expect(JSON.stringify(hidden)).not.toContain('травма колена')

    expect(
      trainerVisibleHealth({
        limitations: 'травма колена',
        medical_notes: 'астма',
        health_data_consent: false,
      }).status,
    ).toBe('private')

    expect(
      trainerVisibleHealth({
        limitations: '  ',
        medical_notes: null,
        health_data_consent: true,
      }),
    ).toEqual({ status: 'empty', message: TRAINER_HEALTH_EMPTY_MESSAGE })

    expect(
      trainerVisibleHealth({
        limitations: 'травма колена',
        medical_notes: 'астма',
        health_data_consent: true,
      }),
    ).toEqual({
      status: 'shared',
      limitations: 'травма колена',
      medicalNotes: 'астма',
    })
  })
})
