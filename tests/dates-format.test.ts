import { formatCalendarDate, formatHeadingDate, formatWorkoutSessionTitle } from '../src/lib/dates'

describe('formatCalendarDate', () => {
  it('даёт длинную и короткую форму', () => {
    expect(formatCalendarDate('2026-11-16', 'long')).toBe('16 ноября')
    expect(formatCalendarDate('2026-11-16', 'short')).toBe('пн, 16 нояб.')
    expect(formatCalendarDate(new Date(2026, 10, 16), 'short')).toBe('пн, 16 нояб.')
  })

  it('собирает заголовок и строку тренировки из того же помощника', () => {
    expect(formatHeadingDate(new Date(2026, 10, 16))).toBe('Понедельник, 16 ноября')
    expect(formatWorkoutSessionTitle('2026-11-16')).toBe('Тренировка · пн, 16 нояб.')
    expect(formatCalendarDate('не-дата')).toBe('не-дата')
  })
})
