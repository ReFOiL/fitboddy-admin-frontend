import type { GenerationPolicy, SessionSizeBounds } from '../types/generation-policy'

export const DEFAULT_SESSION_BOUNDS: Record<string, SessionSizeBounds> = {
  default: { min: 4, max: 7 },
  beginner: { min: 3, max: 5 },
  intermediate: { min: 4, max: 6 },
  advanced: { min: 4, max: 7 },
  rehabilitation: { min: 3, max: 4 },
}

function normalizeSessionBounds(raw: unknown, fallback: SessionSizeBounds): SessionSizeBounds {
  if (!raw || typeof raw !== 'object') return fallback
  const min = Number((raw as SessionSizeBounds).min)
  const max = Number((raw as SessionSizeBounds).max)
  const safeMin = Number.isFinite(min) ? Math.min(12, Math.max(1, min)) : fallback.min
  const safeMax = Number.isFinite(max) ? Math.min(12, Math.max(1, max)) : fallback.max
  return safeMin <= safeMax ? { min: safeMin, max: safeMax } : { min: safeMax, max: safeMin }
}

export function normalizeGenerationPolicy(
  input: Partial<GenerationPolicy> | null | undefined,
): GenerationPolicy {
  const pairs = Array.isArray(input?.excluded_pairs) ? input.excluded_pairs : []
  const splits =
    input?.default_splits && typeof input.default_splits === 'object' ? input.default_splits : {}
  const workouts =
    input?.default_workouts_per_week && typeof input.default_workouts_per_week === 'object'
      ? input.default_workouts_per_week
      : {}
  const sessions =
    input?.exercises_per_session && typeof input.exercises_per_session === 'object'
      ? input.exercises_per_session
      : {}

  return {
    excluded_pairs: pairs
      .filter((pair): pair is string[] => Array.isArray(pair) && pair.length >= 2)
      .map((pair) => [String(pair[0]), String(pair[1])]),
    default_splits: Object.fromEntries(
      Object.entries(splits).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.map(String) : [],
      ]),
    ),
    default_workouts_per_week: Object.fromEntries(
      Object.entries(workouts).map(([key, value]) => [key, Number(value) || 3]),
    ),
    exercises_per_session: Object.fromEntries(
      Object.entries(DEFAULT_SESSION_BOUNDS).map(([key, fallback]) => [
        key,
        normalizeSessionBounds(sessions[key], fallback),
      ]),
    ),
  }
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'undefined'
}

export function isGenerationPolicyDirty(saved: GenerationPolicy, draft: GenerationPolicy): boolean {
  const comparable = (policy: GenerationPolicy) => {
    const normalized = normalizeGenerationPolicy(policy)
    return {
      ...normalized,
      default_workouts_per_week: {
        beginner: 3,
        intermediate: 3,
        advanced: 3,
        ...normalized.default_workouts_per_week,
      },
    }
  }

  return (
    stableSerialize(comparable(saved)) !==
    stableSerialize(comparable(draft))
  )
}
