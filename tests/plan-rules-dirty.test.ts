import {
  clampBoundedInt,
  isGenerationPolicyDirty,
  normalizeGenerationPolicy,
} from '../src/lib/generation-policy'

describe('PlanRules dirty state', () => {
  const saved = normalizeGenerationPolicy({
    excluded_pairs: [['push-up', 'bench-press']],
    default_splits: { 'maintenance|beginner': ['upper', 'lower'] },
    default_workouts_per_week: { beginner: 3 },
    exercises_per_session: { default: { min: 4, max: 7 } },
  })

  it('не считает изменением эквивалентный policy с другим порядком ключей', () => {
    const equivalent = {
      exercises_per_session: { ...saved.exercises_per_session },
      default_workouts_per_week: { ...saved.default_workouts_per_week },
      default_splits: { ...saved.default_splits },
      excluded_pairs: saved.excluded_pairs.map((pair) => [...pair]),
    }

    expect(isGenerationPolicyDirty(saved, equivalent)).toBe(false)
  })

  it('не считает изменением явно выбранное отображаемое значение по умолчанию', () => {
    const withoutExplicitDefaults = {
      ...saved,
      default_workouts_per_week: {},
    }
    const withExplicitDefaults = {
      ...saved,
      default_workouts_per_week: { beginner: 3, intermediate: 3, advanced: 3 },
    }

    expect(isGenerationPolicyDirty(withoutExplicitDefaults, withExplicitDefaults)).toBe(false)
  })

  it('определяет изменение вложенных настроек', () => {
    const changed = {
      ...saved,
      default_workouts_per_week: {
        ...saved.default_workouts_per_week,
        beginner: 4,
      },
    }

    expect(isGenerationPolicyDirty(saved, changed)).toBe(true)
  })

  it('ограничивает дни 1–7 и размер сессии 1–12, пустое значение не становится нулём', () => {
    expect(clampBoundedInt('', 1, 7, 3)).toBe(3)
    expect(clampBoundedInt('0', 1, 7, 3)).toBe(1)
    expect(clampBoundedInt('9', 1, 7, 3)).toBe(7)
    expect(clampBoundedInt('20', 1, 12, 4)).toBe(12)

    const normalized = normalizeGenerationPolicy({
      default_workouts_per_week: { beginner: 0, intermediate: 9, advanced: 3.8 },
      exercises_per_session: { default: { min: 0, max: 20 } },
    })

    expect(normalized.default_workouts_per_week).toEqual({
      beginner: 1,
      intermediate: 7,
      advanced: 3,
    })
    expect(normalized.exercises_per_session.default).toEqual({ min: 1, max: 12 })
  })
})
