import {
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
})
