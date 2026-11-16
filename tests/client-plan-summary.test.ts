import { clientDayMark, completedWeekStreak, estimateWorkoutMinutes, trainerNotes } from '../src/lib/client-plan-summary'
import type { PlanDay, PlanExercise, TrainingPlan } from '../src/types/plan'

function exercise(partial: Partial<PlanExercise> = {}): PlanExercise {
  return {
    line_id: 'line',
    exercise_id: 'exercise',
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
    ...partial,
  }
}

function day(partial: Partial<PlanDay> = {}): PlanDay {
  return {
    day_id: 'day',
    day_index: 1,
    scheduled_for: '2026-08-10',
    week: 1,
    day_of_week: 0,
    volume_multiplier: 1,
    is_completed: false,
    exercises: [exercise()],
    ...partial,
  }
}

describe('client plan summary', () => {
  it('не выдумывает длительность, если известны только повторы', () => {
    expect(estimateWorkoutMinutes([exercise()])).toBeNull()
  })

  it('считает минуты из длительности подходов и отдыха', () => {
    const minutes = estimateWorkoutMinutes([
      exercise({ sets: 2, duration_seconds: 30, rest_seconds: 0, reps: null }),
    ])
    expect(minutes).toBe(1)
  })

  it('собирает заметки тренера без пустых строк', () => {
    expect(trainerNotes([exercise({ note: '  Медленно  ' }), exercise({ note: 'Медленно' }), exercise()])).toEqual([
      'Медленно',
    ])
  })

  it('считает закрытые недели подряд и пропускает текущую незакрытую', () => {
    const plan = {
      days: [
        day({ day_id: 'a', week: 1, is_completed: true }),
        day({ day_id: 'b', week: 2, is_completed: true }),
        day({ day_id: 'c', week: 3, is_completed: false }),
      ],
    } as TrainingPlan
    expect(completedWeekStreak(plan)).toBe(2)
    expect(completedWeekStreak({ ...plan, days: [day({ is_completed: false })] })).toBeNull()
  })

  it('ставит отметки выполнено, пропуск и план', () => {
    expect(clientDayMark(day({ is_completed: true, scheduled_for: '2026-08-10' }), '2026-08-16', '2026-08-01')).toBe('done')
    expect(clientDayMark(day({ scheduled_for: '2026-08-10' }), '2026-08-16', '2026-08-01')).toBe('missed')
    expect(clientDayMark(day({ scheduled_for: '2026-08-17' }), '2026-08-16', '2026-08-01')).toBe('planned')
    expect(clientDayMark(day({ exercises: [] }), '2026-08-16', '2026-08-01')).toBe('rest')
    expect(clientDayMark(undefined, '2026-08-16', '2026-08-01')).toBe('empty')
  })
})
