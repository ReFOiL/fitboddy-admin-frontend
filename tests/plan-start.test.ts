import { describe, expect, it } from 'vitest'

import {
  formatPlanStartSubtitle,
  isEmptyLeadInDay,
  isSamePlanStartChoice,
  isSkippedWorkout,
  nextMondayOptionRepeatsWorkout,
  nextWeekMonday,
  nextWorkoutDate,
  planStartAnchorsCoincide,
  planStartChoiceForSlots,
  planStartChoiceFromPlan,
  planStartRequest,
} from '../src/lib/plan-start'

const friday = '2026-10-30'

describe('plan start dates', () => {
  it('берёт ближайший слот, включая сегодня', () => {
    expect(nextWorkoutDate([0, 2, 3, 5], friday)).toBe('2026-10-31')
    expect(formatPlanStartSubtitle('2026-10-31')).toBe('Сб, 31 окт')
    expect(nextWorkoutDate([0], friday)).toBe('2026-11-02')
    expect(formatPlanStartSubtitle('2026-11-02')).toBe('Пн, 2 ноя')
    expect(nextWorkoutDate([4], friday)).toBe(friday)
    expect(nextWorkoutDate([], friday)).toBeNull()
  })

  it('понедельник следующей недели не совпадает с сегодняшним понедельником', () => {
    expect(nextWeekMonday(friday)).toBe('2026-11-02')
    expect(nextWeekMonday('2026-10-26')).toBe('2026-11-02')
    expect(nextWeekMonday('2026-11-01')).toBe('2026-11-02')
    expect(formatPlanStartSubtitle('2026-11-03')).toBe('Вт, 3 ноя')
  })

  it('пн–пт для пн/ср/пт даты и подписи различаются', () => {
    const slots = [0, 2, 4]
    const weekdays = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']
    for (const today of weekdays) {
      const workout = nextWorkoutDate(slots, today)
      const monday = nextWeekMonday(today)
      expect(workout).toBeTruthy()
      expect(monday).toBeTruthy()
      expect(workout).not.toBe(monday)
      expect(formatPlanStartSubtitle(workout ?? '')).not.toBe(formatPlanStartSubtitle(monday ?? ''))
      expect(planStartAnchorsCoincide(slots, today)).toBe(false)
      expect(nextMondayOptionRepeatsWorkout(slots, today)).toBe(false)
    }

    expect(nextWorkoutDate([0], '2026-10-19')).toBe('2026-10-19')
    expect(nextWeekMonday('2026-10-19')).toBe('2026-10-26')
    expect(formatPlanStartSubtitle('2026-10-19')).toBe('Пн, 19 окт')
    expect(formatPlanStartSubtitle('2026-10-26')).toBe('Пн, 26 окт')
  })

  it('сб/вс и пн/ср/пт — один понедельник, выбор схлопывается в ближайшую', () => {
    const slots = [0, 2, 4]
    for (const today of ['2026-10-24', '2026-10-25']) {
      expect(nextWorkoutDate(slots, today)).toBe('2026-10-26')
      expect(nextWeekMonday(today)).toBe('2026-10-26')
      expect(formatPlanStartSubtitle('2026-10-26')).toBe('Пн, 26 окт')
      expect(planStartAnchorsCoincide(slots, today)).toBe(true)
      expect(nextMondayOptionRepeatsWorkout(slots, today)).toBe(true)
      expect(planStartChoiceForSlots({ mode: 'next_monday' }, slots, today)).toEqual({ mode: 'next_workout' })
      expect(planStartRequest({ mode: 'next_monday' }, slots, today)).toEqual({
        start_mode: 'next_workout',
        start_date: '2026-10-26',
      })
    }
    expect(planStartChoiceForSlots({ mode: 'next_monday' }, slots, '2026-10-23')).toEqual({ mode: 'next_monday' })
    expect(planStartChoiceForSlots({ mode: 'date', date: '2026-11-04' }, slots, '2026-10-24')).toEqual({
      mode: 'date',
      date: '2026-11-04',
    })
  })

  it('собирает payload выбранного варианта', () => {
    expect(planStartRequest({ mode: 'next_workout' }, [0, 5], friday)).toEqual({
      start_mode: 'next_workout',
      start_date: '2026-10-31',
    })
    expect(planStartRequest({ mode: 'next_monday' }, [0, 5], friday)).toEqual({
      start_mode: 'next_monday',
      start_date: '2026-11-02',
    })
    expect(planStartRequest({ mode: 'date', date: null }, [0], friday)).toBeNull()
    expect(planStartRequest({ mode: 'date', date: '2026-11-03' }, [0], friday)).toEqual({
      start_mode: 'date',
      start_date: '2026-11-03',
    })
  })

  it('восстанавливает сохранённый режим и считает правку', () => {
    expect(planStartChoiceFromPlan({})).toEqual({ mode: 'next_workout' })
    expect(planStartChoiceFromPlan({ start_mode: 'next_monday' })).toEqual({ mode: 'next_monday' })
    expect(planStartChoiceFromPlan({ start_mode: 'date', start_date: '2026-11-03T00:00:00Z' })).toEqual({
      mode: 'date',
      date: '2026-11-03',
    })
    expect(isSamePlanStartChoice({ mode: 'next_workout' }, { mode: 'next_workout' })).toBe(true)
    expect(isSamePlanStartChoice({ mode: 'next_workout' }, { mode: 'next_monday' })).toBe(false)
    expect(
      isSamePlanStartChoice({ mode: 'date', date: '2026-11-03' }, { mode: 'date', date: '2026-11-04' }),
    ).toBe(false)
  })

  it('не считает пустые дни до старта в первой неделе пропущенными', () => {
    const leadIn = { week: 1, scheduledFor: '2026-10-26', exerciseCount: 0, isCompleted: false }
    const missed = { week: 1, scheduledFor: '2026-10-28', exerciseCount: 2, isCompleted: false }
    const afterStart = { week: 1, scheduledFor: '2026-11-05', exerciseCount: 1, isCompleted: false }

    expect(isEmptyLeadInDay(leadIn, '2026-10-27')).toBe(true)
    expect(isEmptyLeadInDay(missed, '2026-10-27')).toBe(false)
    expect(isEmptyLeadInDay({ ...leadIn, week: 2 }, '2026-10-27')).toBe(false)
    expect(isSkippedWorkout(leadIn, friday, '2026-10-27')).toBe(false)
    expect(isSkippedWorkout(missed, friday, '2026-10-27')).toBe(true)
    expect(isSkippedWorkout({ ...missed, isCompleted: true }, friday, '2026-10-27')).toBe(false)
    expect(isSkippedWorkout(afterStart, friday, '2026-10-27')).toBe(false)
  })
})
