import { render, screen } from '@testing-library/react'

import { HealthDataTrainerSummary } from '../src/components/profile/HealthDataTrainerSummary'
import { TRAINER_HEALTH_EMPTY_MESSAGE, TRAINER_HEALTH_PRIVATE_MESSAGE } from '../src/lib/health-data-consent'

describe('HealthDataTrainerSummary', () => {
  it('не показывает сырой текст без согласия', () => {
    render(
      <HealthDataTrainerSummary
        profile={{ limitations: 'травма колена', medical_notes: 'астма' }}
      />,
    )

    expect(screen.queryByText('травма колена')).not.toBeInTheDocument()
    expect(screen.queryByText('астма')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(TRAINER_HEALTH_PRIVATE_MESSAGE)
  })

  it('не показывает сырой текст, если согласие явно отклонено', () => {
    render(
      <HealthDataTrainerSummary
        profile={{ limitations: 'травма колена', medical_notes: 'астма', health_data_consent: false }}
      />,
    )

    expect(screen.queryByText('травма колена')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(TRAINER_HEALTH_PRIVATE_MESSAGE)
  })

  it('показывает текст, на который клиент дал согласие', () => {
    render(
      <HealthDataTrainerSummary
        profile={{ limitations: 'травма колена', medical_notes: 'астма', health_data_consent: true }}
      />,
    )

    expect(screen.getByText('травма колена')).toBeInTheDocument()
    expect(screen.getByText('астма')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('показывает пустое состояние, если согласие есть, а текста нет', () => {
    render(
      <HealthDataTrainerSummary
        profile={{ limitations: '   ', medical_notes: null, health_data_consent: true }}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(TRAINER_HEALTH_EMPTY_MESSAGE)
  })
})
