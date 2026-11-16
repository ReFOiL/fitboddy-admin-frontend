const russianPluralRules = new Intl.PluralRules('ru')

/**
 * Русская форма слова: one / few / many.
 * 1 упражнение, 2 упражнения, 5 упражнений, 0 упражнений, 21 упражнение.
 */
export function plural(count: number, forms: readonly [string, string, string]): string {
  const category = russianPluralRules.select(Math.trunc(Math.abs(count)))
  if (category === 'one') return forms[0]
  if (category === 'few') return forms[1]
  return forms[2]
}

export function pluralPhrase(count: number, forms: readonly [string, string, string]): string {
  return `${count} ${plural(count, forms)}`
}

export const EXERCISE_FORMS = ['упражнение', 'упражнения', 'упражнений'] as const
export const WORKOUT_FORMS = ['тренировка', 'тренировки', 'тренировок'] as const
export const WEEK_FORMS = ['неделя', 'недели', 'недель'] as const
