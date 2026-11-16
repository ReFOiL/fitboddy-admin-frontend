import { describe, expect, it } from 'vitest'

import { missedWorkoutsLabel } from '../src/lib/dates'
import { plural } from '../src/lib/plural'
import { assembleReplacementCopy } from '../src/lib/plan-archive-copy'
import { attentionSubtitle, trainingTodaySubtitle } from '../src/lib/roster'
import { readWorkingWeight } from '../src/lib/working-weight'
import type { PlanDay, TrainingPlan } from '../src/types/plan'

describe('plural', () => {
  it('склоняет 1, 2, 5 и 11–14', () => {
    expect(plural(1, 'день', 'дня', 'дней')).toBe('день')
    expect(plural(2, 'день', 'дня', 'дней')).toBe('дня')
    expect(plural(4, 'день', 'дня', 'дней')).toBe('дня')
    expect(plural(5, 'день', 'дня', 'дней')).toBe('дней')
    expect(plural(11, 'день', 'дня', 'дней')).toBe('дней')
    expect(plural(14, 'день', 'дня', 'дней')).toBe('дней')
    expect(plural(21, 'день', 'дня', 'дней')).toBe('день')
    expect(plural(22, 'день', 'дня', 'дней')).toBe('дня')
  })
})

describe('missedWorkoutsLabel', () => {
  it('не говорит «пропустил» и согласует прилагательное', () => {
    expect(missedWorkoutsLabel(1)).toBe('1 пропущенная тренировка')
    expect(missedWorkoutsLabel(2)).toBe('2 пропущенные тренировки')
    expect(missedWorkoutsLabel(4)).toBe('4 пропущенные тренировки')
    expect(missedWorkoutsLabel(5)).toBe('5 пропущенных тренировок')
    expect(missedWorkoutsLabel(11)).toBe('11 пропущенных тренировок')
    expect(missedWorkoutsLabel(21)).toBe('21 пропущенная тренировка')
    expect(missedWorkoutsLabel(4)).not.toMatch(/Пропустил/)
  })
})

describe('assembleReplacementCopy', () => {
  it('называет дни, упражнения и архив', () => {
    expect(assembleReplacementCopy(4, 3, false)).toContain('Текущий план будет заменён')
    expect(assembleReplacementCopy(4, 3, false)).toContain('4 дня')
    expect(assembleReplacementCopy(4, 3, false)).toContain('3 упражнения')
    expect(assembleReplacementCopy(4, 3, false)).toContain('Ручные правки будут архивированы')
    expect(assembleReplacementCopy(1, 1, false)).toContain('1 день')
    expect(assembleReplacementCopy(1, 1, false)).toContain('1 упражнение')
    expect(assembleReplacementCopy(5, 11, true)).toContain('Несохранённые правки')
  })
})

describe('readWorkingWeight', () => {
  it('принимает запятую и отвергает ноль', () => {
    expect(readWorkingWeight('')).toEqual({ state: 'empty' })
    expect(readWorkingWeight('  ')).toEqual({ state: 'empty' })
    expect(readWorkingWeight('42,5')).toEqual({ state: 'valid', value: 42.5 })
    expect(readWorkingWeight('0')).toEqual({ state: 'invalid' })
    expect(readWorkingWeight('нет')).toEqual({ state: 'invalid' })
  })
})

function planDay(partial: Partial<PlanDay> & Pick<PlanDay, 'day_id' | 'scheduled_for'>): PlanDay {
  return {
    day_index: 1,
    week: 1,
    day_of_week: 0,
    volume_multiplier: 1,
    is_completed: false,
    completed_at: null,
    exercises: [],
    ...partial,
  }
}

describe('trainer roster copy', () => {
  it('подписывает пропуски без рода и показывает упражнения сегодня', () => {
    const plan: TrainingPlan = {
      plan_id: 'plan-1',
      source: 'trainer',
      trainer_user_id: 'trainer-1',
      user_id: 'client-1',
      status: 'active',
      goal: 'maintenance',
      level: 'intermediate',
      workouts_per_week: 2,
      start_date: '2026-11-02',
      end_date: '2026-11-15',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
      days: [
        planDay({
          day_id: 'past',
          scheduled_for: '2026-11-02',
          exercises: [
            {
              line_id: 'a',
              exercise_id: 'a',
              exercise_name: 'Жим',
              category: 'upper',
              is_cardio: false,
              sort_order: 1,
              sets: 3,
              reps: 8,
              duration_seconds: null,
              rest_seconds: 60,
              weight_kg: 40,
              set_prescriptions: [],
            },
          ],
        }),
      ],
    }
    expect(
      attentionSubtitle({
        planState: 'ready',
        plan,
        todayIso: '2026-11-16',
        createdAt: '2026-09-01T00:00:00Z',
      }),
    ).toBe('1 пропущенная тренировка')

    const today = planDay({
      day_id: 'today',
      scheduled_for: '2026-11-16',
      scheduled_time: '18:00:00',
      exercises: [
        {
          line_id: 'a',
          exercise_id: 'a',
          exercise_name: 'Жим лёжа',
          category: 'upper',
          is_cardio: false,
          sort_order: 1,
          sets: 3,
          reps: 8,
          duration_seconds: null,
          rest_seconds: 90,
          weight_kg: 40,
          set_prescriptions: [],
        },
        {
          line_id: 'b',
          exercise_id: 'b',
          exercise_name: 'Тяга',
          category: 'upper',
          is_cardio: false,
          sort_order: 2,
          sets: 3,
          reps: 10,
          duration_seconds: null,
          rest_seconds: 60,
          weight_kg: 30,
          set_prescriptions: [],
        },
        {
          line_id: 'c',
          exercise_id: 'c',
          exercise_name: 'Планка',
          category: 'core',
          is_cardio: false,
          sort_order: 3,
          sets: 3,
          reps: null,
          duration_seconds: 30,
          rest_seconds: 30,
          weight_kg: null,
          set_prescriptions: [],
        },
      ],
    })
    expect(trainingTodaySubtitle(today)).toBe('День 1 · 18:00 · Жим лёжа, Тяга +1')
  })
})
