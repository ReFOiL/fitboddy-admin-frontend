import {
  formatExerciseSummary,
  formatPlanDate,
  formatSetLine,
  formatWeekday,
  formatWeekdayShort,
  hasSetProgression,
  textOrFallback,
} from '../src/lib/plan-formatters'
import type { PlanExercise, SetPrescription } from '../src/types/plan'

const set = (overrides: Partial<SetPrescription> = {}): SetPrescription => ({
  set_index: 1,
  reps: 10,
  duration_seconds: null,
  weight_kg: 20,
  rest_seconds: 60,
  ...overrides,
})

const exercise = (overrides: Partial<PlanExercise> = {}): PlanExercise => ({
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
  ...overrides,
})

describe('plan-formatters', () => {
  it('formats dates, weekdays and missing text', () => {
    expect(formatPlanDate('2026-08-06')).toBe('6.08')
    expect(formatPlanDate('not-a-date')).toBe('not-a-date')
    expect(formatWeekdayShort(0)).toBe('Пн')
    expect(formatWeekday(6)).toBe('Воскресенье')
    expect(formatWeekdayShort(12)).toBe('—')
    expect(textOrFallback('  цель  ')).toBe('цель')
    expect(textOrFallback(' ')).toBe('Не указано')
  })

  it('formats set and exercise prescriptions', () => {
    expect(formatSetLine(set())).toBe('Подход 1 · 10 повт. · 20 кг · отдых 60 сек')
    expect(formatSetLine(set({ reps: null, duration_seconds: 30, weight_kg: null }))).toBe(
      'Подход 1 · 30 сек · отдых 60 сек',
    )
    expect(formatExerciseSummary(exercise())).toBe('3× 10 повт. 20 кг')
    expect(formatExerciseSummary(exercise({ sets: null, reps: null, weight_kg: null }))).toBe('По программе')
  })

  it('detects progression between sets', () => {
    expect(hasSetProgression([set(), set({ set_index: 2 })])).toBe(false)
    expect(hasSetProgression([set(), set({ set_index: 2, weight_kg: 25 })])).toBe(true)
    expect(hasSetProgression([set()])).toBe(false)
  })
})
