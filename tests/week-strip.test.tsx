import { render, screen } from '@testing-library/react'

import { WeekStrip } from '../src/components/plan/WeekStrip'
import type { PlanDay } from '../src/types/plan'

const day: PlanDay = {
  day_id: 'day-1',
  day_index: 1,
  scheduled_for: '2026-08-16',
  week: 1,
  day_of_week: 6,
  volume_multiplier: 1,
  is_completed: true,
  exercises: [
    {
      line_id: 'line-1',
      exercise_id: 'exercise-1',
      exercise_name: 'Присед',
      category: 'legs',
      is_cardio: false,
      sort_order: 1,
      sets: 3,
      reps: 8,
      duration_seconds: null,
      rest_seconds: null,
      weight_kg: null,
      set_prescriptions: [],
    },
  ],
}

describe('WeekStrip', () => {
  it('показывает семь дней и отметку выполненного', () => {
    render(<WeekStrip days={[day]} focusedDayId={null} todayIso="2026-08-16" onSelectDay={() => undefined} />)
    expect(screen.getAllByRole('button')).toHaveLength(7)
    expect(screen.getByRole('button', { name: /Вс, 16, сегодня, выполнено/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Пн, 10/ })).toBeDisabled()
  })
})
