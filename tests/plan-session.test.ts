import { act, renderHook } from '@testing-library/react'

import { useWorkoutSession } from '../src/hooks/use-workout-session'
import {
  clearSessionChecks,
  formatRestClock,
  loadActiveWorkoutDay,
  loadSessionChecks,
  markLineChecked,
  saveSessionChecks,
  sessionChecksKey,
} from '../src/lib/plan-session'
import type { TodayWorkout } from '../src/types/plan'

const workout: TodayWorkout = {
  plan_id: 'plan-1',
  source: 'system',
  trainer_user_id: null,
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

describe('plan session storage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('formats the rest clock and marks a line in the shared checklist', () => {
    expect(formatRestClock(90)).toBe('1:30')
    expect(formatRestClock(0)).toBe('0:00')
    expect(formatRestClock(61)).toBe('1:01')
    markLineChecked('day-1', 'line-1')
    expect(loadSessionChecks('day-1').has('line-1')).toBe(true)
  })

  it('saves, loads and clears checklist ids', () => {
    saveSessionChecks('day-1', new Set(['line-1', 'line-2']))
    expect([...loadSessionChecks('day-1')]).toEqual(['line-1', 'line-2'])

    clearSessionChecks('day-1')
    expect(loadSessionChecks('day-1').size).toBe(0)
  })

  it('ignores malformed storage data', () => {
    sessionStorage.setItem(sessionChecksKey('day-1'), '{"not":"a list"}')
    expect(loadSessionChecks('day-1').size).toBe(0)
  })

  it('manages active session and persisted checklist state', () => {
    const { result } = renderHook(() => useWorkoutSession(workout))

    act(() => result.current.start())
    expect(result.current.isActive).toBe(true)

    act(() => result.current.toggleChecked('line-1'))
    expect(result.current.checkedCount).toBe(1)
    expect(loadSessionChecks('day-1').has('line-1')).toBe(true)

    act(() => result.current.finish())
    expect(result.current.isActive).toBe(false)
    expect(result.current.checkedCount).toBe(0)
    expect(loadSessionChecks('day-1').size).toBe(0)
    expect(loadActiveWorkoutDay()).toBeNull()
  })

  it('restores an in-progress workout after the page unmounts', () => {
    const first = renderHook(() => useWorkoutSession(workout))
    act(() => first.result.current.start())
    act(() => first.result.current.toggleChecked('line-1'))
    first.unmount()

    const second = renderHook(() => useWorkoutSession(workout))
    expect(second.result.current.isActive).toBe(true)
    expect(second.result.current.checkedCount).toBe(1)

    act(() => second.result.current.collapse())
    second.unmount()

    const third = renderHook(() => useWorkoutSession(workout))
    expect(third.result.current.isActive).toBe(false)
    expect(loadSessionChecks('day-1').has('line-1')).toBe(true)
    expect(loadActiveWorkoutDay()).toBeNull()
  })
})
