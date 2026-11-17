import { describe, expect, it } from 'vitest'

import { moveDraftSlot, type DraftSlot } from '../src/lib/plan-draft'
import { clientRosterFacts, clientStatusLabel } from '../src/lib/roster'
import { dayFocusLabel, missedWeekLabel, weekRangeLabel } from '../src/lib/plan-studio-view'
import type { PlanDay, PlanExercise, TrainingPlan } from '../src/types/plan'

function slot(name: string): DraftSlot {
  return {
    key: name,
    exerciseId: name,
    exerciseName: name,
    sets: 1,
    reps: 1,
    durationSeconds: null,
    restSeconds: null,
    weightKg: null,
    note: '',
  }
}

function exercise(name: string): PlanExercise {
  return {
    line_id: name,
    exercise_id: name,
    exercise_name: name,
    category: 'upper',
    is_cardio: false,
    sort_order: 1,
    sets: 3,
    reps: 8,
    duration_seconds: null,
    rest_seconds: 60,
    weight_kg: 40,
    set_prescriptions: [],
  }
}

function plan(partial: Partial<TrainingPlan> & { days: PlanDay[] }): TrainingPlan {
  return {
    plan_id: 'plan-1',
    source: 'trainer',
    trainer_user_id: 'trainer-1',
    user_id: 'client-1',
    status: 'active',
    goal: 'maintenance',
    level: 'intermediate',
    workouts_per_week: 3,
    start_date: '2026-11-02',
    end_date: '2026-12-27',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    ...partial,
  }
}

function day(partial: Partial<PlanDay> & Pick<PlanDay, 'day_id' | 'scheduled_for'>): PlanDay {
  return {
    day_index: 1,
    week: 1,
    day_of_week: 0,
    volume_multiplier: 1,
    is_completed: false,
    completed_at: null,
    exercises: [exercise('Жим')],
    ...partial,
  }
}

describe('clientRosterFacts', () => {
  const today = '2026-11-17'

  it('помечает план, который кончается в течение недели', () => {
    const facts = clientRosterFacts({
      planState: 'ready',
      todayIso: today,
      plan: plan({
        end_date: '2026-11-23',
        days: [day({ day_id: 'done', scheduled_for: '2026-11-16', is_completed: true })],
      }),
    })
    expect(facts.highlight).toBe('ending')
    expect(facts.tag).toBe('План заканчивается')
    expect(facts.status).toBe('active')
    expect(clientStatusLabel(facts.status)).toBe('Активна')
    expect(facts.missedCount).toBe(0)
  })

  it('не считает окончание через 8 дней срочным', () => {
    const facts = clientRosterFacts({
      planState: 'ready',
      todayIso: today,
      plan: plan({
        end_date: '2026-11-25',
        days: [day({ day_id: 'done', scheduled_for: '2026-11-16', is_completed: true })],
      }),
    })
    expect(facts.highlight).toBe('none')
    expect(facts.tag).toBeNull()
  })

  it('подсвечивает долгий перерыв и считает пропуски', () => {
    const facts = clientRosterFacts({
      planState: 'ready',
      todayIso: today,
      plan: plan({
        days: [
          day({ day_id: 'old', scheduled_for: '2026-11-04', is_completed: true, exercises: [] }),
          day({ day_id: 'miss-1', day_index: 2, scheduled_for: '2026-11-09', exercises: [exercise('Жим')] }),
          day({ day_id: 'miss-2', day_index: 3, scheduled_for: '2026-11-11', exercises: [exercise('Тяга')] }),
        ],
      }),
    })
    expect(facts.highlight).toBe('absent')
    expect(facts.tag).toBe('Давно не тренировался')
    expect(facts.status).toBe('missed')
    expect(facts.missedCount).toBe(2)
    expect(facts.lastWorkoutIso).toBe('2026-11-04')
  })

  it('недавний пропуск не красит строку, если тренировка была на этой неделе', () => {
    const facts = clientRosterFacts({
      planState: 'ready',
      todayIso: today,
      plan: plan({
        days: [
          day({ day_id: 'recent', scheduled_for: '2026-11-15', is_completed: true }),
          day({ day_id: 'miss', day_index: 2, scheduled_for: '2026-11-16' }),
        ],
      }),
    })
    expect(facts.highlight).toBe('none')
    expect(facts.status).toBe('missed')
    expect(facts.missedCount).toBe(1)
  })

  it('для пустого плана оставляет прочерки', () => {
    const facts = clientRosterFacts({ planState: 'missing', plan: null, todayIso: today })
    expect(facts.status).toBe('no-plan')
    expect(clientStatusLabel(facts.status)).toBe('Нет плана')
    expect(facts.planUntilIso).toBeNull()
    expect(facts.lastWorkoutIso).toBeNull()
    expect(facts.missedCount).toBeNull()
    expect(facts.tag).toBeNull()
  })

  it('пока план грузится, не выдумывает цифры', () => {
    const facts = clientRosterFacts({ planState: 'loading', plan: null, todayIso: today })
    expect(facts.status).toBe('loading')
    expect(clientStatusLabel(facts.status)).toBe('Загрузка…')
    expect(facts.missedCount).toBeNull()
  })
})

describe('plan studio view', () => {
  it('собирает диапазон недели и подпись фокуса', () => {
    expect(weekRangeLabel('2026-11-18')).toBe('16–22 ноября')
    expect(dayFocusLabel(['lower'])).toBe('Низ тела')
    expect(dayFocusLabel(['upper', 'lower'])).toBe('Полное тело')
    expect(missedWeekLabel(1)).toBe('1 пропуск')
    expect(missedWeekLabel(2)).toBe('2 пропуска')
    expect(missedWeekLabel(0)).toBeNull()
  })

  it('переставляет упражнения и не трогает исходный массив', () => {
    const slots = [slot('a'), slot('b'), slot('c')]
    expect(moveDraftSlot(slots, 0, 2).map((item) => item.key)).toEqual(['b', 'c', 'a'])
    expect(moveDraftSlot(slots, 1, 1)).toBe(slots)
    expect(slots.map((item) => item.key)).toEqual(['a', 'b', 'c'])
  })
})
