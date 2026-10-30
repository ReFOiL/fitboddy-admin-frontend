import { describe, expect, it } from 'vitest'

import { weekdayOutcomeMessage, weekdaySlots, weekdaySwapTitle } from '../src/lib/plan-weekday'

describe('weekdaySlots', () => {
  const week = [
    { dayIndex: 1, dayOfWeek: 0 },
    { dayIndex: 4, dayOfWeek: 2 },
  ]

  it('помечает свободные дни и занятые в той же неделе', () => {
    const slots = weekdaySlots(week, 2)
    expect(slots.map((slot) => [slot.dayOfWeek, slot.kind, slot.dayIndex])).toEqual([
      [0, 'occupied', 1],
      [1, 'free', null],
      [2, 'current', null],
      [3, 'free', null],
      [4, 'free', null],
      [5, 'free', null],
      [6, 'free', null],
    ])
  })

  it('собирает подпись обмена по порядку недели', () => {
    expect(weekdaySwapTitle(2, 0)).toBe('Пн ↔ Ср')
    expect(weekdaySwapTitle(4, 6)).toBe('Пт ↔ Вс')
  })

  it('различает назначение свободного дня и обмен', () => {
    expect(weekdayOutcomeMessage('set')).toBe('День недели изменён')
    expect(weekdayOutcomeMessage('swap')).toBe('Дни поменялись местами')
  })
})
