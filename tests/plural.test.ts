import { EXERCISE_FORMS, plural, pluralPhrase, WORKOUT_FORMS } from '../src/lib/plural'

describe('plural', () => {
  it('склоняет по правилам русского языка', () => {
    expect(plural(1, EXERCISE_FORMS)).toBe('упражнение')
    expect(plural(2, EXERCISE_FORMS)).toBe('упражнения')
    expect(plural(5, EXERCISE_FORMS)).toBe('упражнений')
    expect(plural(0, EXERCISE_FORMS)).toBe('упражнений')
    expect(plural(11, EXERCISE_FORMS)).toBe('упражнений')
    expect(plural(21, EXERCISE_FORMS)).toBe('упражнение')
    expect(plural(22, WORKOUT_FORMS)).toBe('тренировки')
    expect(pluralPhrase(1, WORKOUT_FORMS)).toBe('1 тренировка')
    expect(pluralPhrase(0, EXERCISE_FORMS)).toBe('0 упражнений')
  })
})
