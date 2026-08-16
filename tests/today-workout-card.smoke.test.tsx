import { render, screen } from '@testing-library/react'

import { TodayWorkoutCard } from '../src/components/plan/TodayWorkoutCard'
import { selectPlanDay } from '../src/lib/plan-day-selector'
import type { PlanDay, TodayWorkout } from '../src/types/plan'

const planDay: PlanDay = {
  day_id: 'day-1',
  day_index: 1,
  scheduled_for: '2026-08-16',
  week: 1,
  day_of_week: 6,
  volume_multiplier: 1,
  is_completed: false,
  completed_at: null,
  exercises: [
    {
      line_id: 'line-1',
      exercise_id: 'exercise-1',
      exercise_name: 'Присед',
      category: 'legs',
      is_cardio: false,
      sort_order: 1,
      sets: 3,
      reps: 10,
      duration_seconds: null,
      rest_seconds: 60,
      weight_kg: 20,
      set_prescriptions: [],
    },
  ],
}

const todayWorkout: TodayWorkout = {
  plan_id: 'plan-1',
  source: 'system',
  trainer_user_id: null,
  ...planDay,
  is_completed: false,
  completed_at: null,
}

const commonProps = {
  todayIso: '2026-08-16',
  planSourceLabel: 'Самостоятельно',
  onStartWorkout: () => undefined,
}

describe('TodayWorkoutCard', () => {
  it('renders no-plan, rest and workout states', () => {
    const { rerender } = render(
      <TodayWorkoutCard
        {...commonProps}
        selection={selectPlanDay({ plan: null, todayIso: commonProps.todayIso })}
      />,
    )
    expect(screen.getByText('Нет активного плана')).toBeInTheDocument()

    rerender(
      <TodayWorkoutCard
        {...commonProps}
        selection={selectPlanDay({
          plan: { days: [{ ...planDay, scheduled_for: '2026-08-17' }] },
          todayIso: commonProps.todayIso,
        })}
        todayMissing
      />,
    )
    expect(screen.getByText('День отдыха')).toBeInTheDocument()

    rerender(
      <TodayWorkoutCard
        {...commonProps}
        selection={selectPlanDay({ plan: { days: [planDay] }, todayIso: commonProps.todayIso })}
        todayWorkout={todayWorkout}
      />,
    )
    expect(screen.getByRole('button', { name: 'Начать тренировку' })).toBeInTheDocument()
    expect(screen.getByText('Присед')).toBeInTheDocument()
  })
})
