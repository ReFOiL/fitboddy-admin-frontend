import {
  applyGenerationPreset,
  beginnerGeneratorExample,
  isGenerationPolicyDirty,
  matchingGenerationPreset,
  normalizeGenerationPolicy,
} from '../src/lib/generation-policy'

const saved = normalizeGenerationPolicy({
  excluded_pairs: [['a', 'b']],
  default_splits: { 'maintenance|beginner': ['upper'] },
  default_workouts_per_week: { beginner: 3, intermediate: 3, advanced: 3 },
  exercises_per_session: {},
})

describe('наборы правил генератора', () => {
  it('стандарт совпадает с числами по умолчанию и даёт пример для новичка', () => {
    expect(matchingGenerationPreset(saved)).toBe('standard')
    expect(beginnerGeneratorExample(saved)).toBe('Новичок получит 3 тренировки в неделю по 3–5 упражнений')
    expect(isGenerationPolicyDirty(saved, applyGenerationPreset(saved, 'standard'))).toBe(false)
  })

  it('мягкий набор меняет числа и не трогает запреты', () => {
    const next = applyGenerationPreset(saved, 'gentle')
    expect(matchingGenerationPreset(next)).toBe('gentle')
    expect(beginnerGeneratorExample(next)).toBe('Новичок получит 2 тренировки в неделю по 2–4 упражнения')
    expect(next.excluded_pairs).toEqual([['a', 'b']])
    expect(next.default_splits['maintenance|beginner']).toEqual(['upper'])
    expect(isGenerationPolicyDirty(saved, next)).toBe(true)
  })
})
