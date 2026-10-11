import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'

import { TrainerPlanEditor } from '../src/components/plan-editor/TrainerPlanEditor'
import { createEmptyCycle, type EditorDay } from '../src/lib/plan-editor-draft'
import type { TrainerExercise } from '../src/types/exercise'

const catalogExercise = {
  row_id: 'row-1',
  trainer_user_id: 'trainer-1',
  exercise_name: 'Присед',
  description: null,
  equipment: 'none',
  is_cardio: false,
  is_hold: false,
  difficulty: 2,
  workout_category: 'lower',
  default_sets: 3,
  default_reps: 8,
  default_duration_seconds: null,
  default_rest_seconds: 60,
  default_weight_kg: 20,
  load_scheme: 'flat',
  scheme_steps: [],
  is_active: true,
  video_url: null,
  start_image_url: null,
  end_image_url: null,
  created_at: '',
  updated_at: '',
  primary_muscles: [],
  secondary_muscles: [],
} satisfies TrainerExercise

function Harness({ initialDays }: { initialDays: EditorDay[] | null }) {
  const [days, setDays] = useState<EditorDay[] | null>(initialDays)
  return (
    <TrainerPlanEditor
      clientName="Анна"
      levelLabel="Новичок"
      trainerUserId="trainer-1"
      backTo="/clients/profile?clientUserId=client-1"
      days={days}
      catalog={[catalogExercise]}
      catalogLoading={false}
      isDirty={days != null}
      dosageError={null}
      savePending={false}
      saveDisabled={days == null}
      generatePending={false}
      generateDisabledReason="Собрать из каталога нельзя: в анкете не указан пол."
      foreignPlanNotice={null}
      onChangeDays={setDays}
      onSave={() => undefined}
      onGenerate={() => undefined}
      onStartEmpty={(count) => setDays(createEmptyCycle(count))}
    />
  )
}

describe('TrainerPlanEditor', () => {
  it('offers catalog build and an empty cycle when there is no plan', () => {
    render(
      <MemoryRouter>
        <Harness initialDays={null} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Анна' })).toBeInTheDocument()
    expect(screen.getByText('Уровень: Новичок')).toBeInTheDocument()
    expect(screen.getByText('Собрать из каталога нельзя: в анкете не указан пол.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Собрать из каталога' })[0]).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Начать с пустого' }))
    expect(screen.getByRole('tab', { name: 'День 1' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'День 3' })).toBeInTheDocument()
  })

  it('adds, reorders, and deletes a slot from the trainer catalog', () => {
    const days = createEmptyCycle(1)
    render(
      <MemoryRouter>
        <Harness initialDays={days} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Добавить упражнение' }))
    const catalogButton = () => screen.getByRole('button', { name: /ПриседБез инвентаря/ })
    fireEvent.click(catalogButton())
    expect(screen.getByRole('heading', { name: 'Присед' })).toBeInTheDocument()
    expect(screen.getByLabelText('Подходы: Присед')).toHaveValue('3')
    expect(screen.getByLabelText('Повторы: Присед')).toHaveValue('8')

    fireEvent.click(catalogButton())
    expect(screen.getAllByRole('heading', { name: 'Присед' })).toHaveLength(2)

    fireEvent.click(screen.getAllByRole('button', { name: 'Ниже: Присед' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: 'Удалить Присед' })[0])
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)
  })
})
