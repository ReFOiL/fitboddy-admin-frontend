import { describe, expect, it } from 'vitest'

import { formatWorkoutDuration } from '../src/lib/dates'
import { isDayDirty, slotsToWrite, type DayDraft } from '../src/lib/plan-draft'
import { trainingTodaySubtitle } from '../src/lib/roster'
import type { PlanDay } from '../src/types/plan'

function day(overrides: Partial<DayDraft> = {}): DayDraft {
  return {
    dayIndex: 1,
    dayId: 'day-1',
    week: 1,
    dayOfWeek: 0,
    scheduledFor: '2026-10-20',
    scheduledTime: null,
    isCompleted: false,
    slots: [
      {
        key: 'line-1',
        exerciseId: 'exercise-1',
        exerciseName: 'Жим',
        sets: 3,
        reps: 10,
        durationSeconds: null,
        restSeconds: 90,
        weightKg: 45,
        note: '',
      },
    ],
    ...overrides,
  }
}

describe('plan editor follow-ups', () => {
  it('отправляет заметку и очищает её пустой строкой', () => {
    const withNote = day()
    withNote.slots[0].note = '  медленно вниз  '
    expect(slotsToWrite(withNote.slots)[0].note).toBe('медленно вниз')

    const cleared = day()
    cleared.slots[0].note = '   '
    expect(slotsToWrite(cleared.slots)[0].note).toBeNull()
  })

  it('считает время тренировки несохранённым изменением', () => {
    expect(isDayDirty(day(), day({ scheduledTime: '18:00' }))).toBe(true)
    expect(isDayDirty(day({ scheduledTime: '18:00' }), day({ scheduledTime: '18:00' }))).toBe(false)
  })

  it('показывает время в строке «тренируются сегодня»', () => {
    const planDay = {
      day_id: 'day-1',
      day_index: 2,
      scheduled_for: '2026-10-20',
      week: 1,
      day_of_week: 1,
      volume_multiplier: 1,
      scheduled_time: '18:00',
      exercises: [],
    } satisfies PlanDay
    expect(trainingTodaySubtitle(planDay)).toBe('День 2 · 18:00 · 0 упр.')
  })

  it('считает длительность только если известны оба момента', () => {
    expect(formatWorkoutDuration('2026-10-20T18:02:00Z', '2026-10-20T18:50:00Z')).toBe('48 мин')
    expect(formatWorkoutDuration(null, '2026-10-20T18:50:00Z')).toBeNull()
  })
})