import { selectPlanDay } from '../src/lib/plan-day-selector'
import type { PlanDay } from '../src/types/plan'

const day = (overrides: Partial<PlanDay> = {}): PlanDay => ({
  day_id: 'day-1',
  day_index: 1,
  scheduled_for: '2026-08-16',
  week: 1,
  day_of_week: 6,
  volume_multiplier: 1,
  is_completed: false,
  completed_at: null,
  exercises: [],
  ...overrides,
})

describe('selectPlanDay', () => {
  it('distinguishes no plan from a rest day', () => {
    expect(selectPlanDay({ plan: null, todayIso: '2026-08-16' }).kind).toBe('no-plan')

    const selection = selectPlanDay({
      plan: { days: [day({ scheduled_for: '2026-08-17' })] },
      todayIso: '2026-08-16',
    })
    expect(selection.kind).toBe('rest')
    expect(selection.weekDays).toHaveLength(1)
  })

  it('selects today by default and an explicitly selected day when provided', () => {
    const days = [
      day({ day_id: 'day-2', day_index: 2, scheduled_for: '2026-08-18' }),
      day(),
    ]
    const todaySelection = selectPlanDay({ plan: { days }, todayIso: '2026-08-16' })
    expect(todaySelection.kind).toBe('workout')
    expect(todaySelection.day?.day_id).toBe('day-1')
    expect(todaySelection.isToday).toBe(true)
    expect(todaySelection.sortedDays.map((item) => item.day_id)).toEqual(['day-1', 'day-2'])

    const selected = selectPlanDay({
      plan: { days },
      todayIso: '2026-08-16',
      selectedDayId: 'day-2',
    })
    expect(selected.day?.day_id).toBe('day-2')
    expect(selected.isToday).toBe(false)
  })

  it('uses the API workout week when today is absent from plan days', () => {
    const selection = selectPlanDay({
      plan: {
        days: [
          day({ day_id: 'week-1', week: 1 }),
          day({ day_id: 'week-2', week: 2, day_index: 8 }),
        ],
      },
      todayIso: '2026-08-20',
      todayWorkout: { week: 2 },
    })
    expect(selection.weekDays.map((item) => item.day_id)).toEqual(['week-2'])
  })
})
