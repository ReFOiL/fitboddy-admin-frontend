import { EXERCISE_FORMS, plural } from './plural'
import type { GenerationPolicy, SessionSizeBounds } from '../types/generation-policy'

const WORKOUT_ACCUSATIVE = ['тренировку', 'тренировки', 'тренировок'] as const

export const DEFAULT_SESSION_BOUNDS: Record<string, SessionSizeBounds> = {
  default: { min: 4, max: 7 },
  beginner: { min: 3, max: 5 },
  intermediate: { min: 4, max: 6 },
  advanced: { min: 4, max: 7 },
  rehabilitation: { min: 3, max: 4 },
}

export function clampBoundedInt(raw: string, min: number, max: number, fallback: number): number {
  if (raw.trim() === '') return fallback
  const next = Number(raw)
  if (!Number.isFinite(next)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(next)))
}

function clampWorkoutsPerWeek(value: unknown): number {
  if (value == null || value === '') return 3
  const next = Number(value)
  if (!Number.isFinite(next)) return 3
  return Math.min(7, Math.max(1, Math.trunc(next)))
}

function normalizeSessionBounds(raw: unknown, fallback: SessionSizeBounds): SessionSizeBounds {
  if (!raw || typeof raw !== 'object') return fallback
  const min = Number((raw as SessionSizeBounds).min)
  const max = Number((raw as SessionSizeBounds).max)
  const safeMin = Number.isFinite(min) ? Math.min(12, Math.max(1, Math.trunc(min))) : fallback.min
  const safeMax = Number.isFinite(max) ? Math.min(12, Math.max(1, Math.trunc(max))) : fallback.max
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
      Object.entries(workouts).map(([key, value]) => [key, clampWorkoutsPerWeek(value)]),
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

export const GENERATION_PRESET_ORDER = ['standard', 'gentle', 'intense'] as const
export type GenerationPresetId = (typeof GENERATION_PRESET_ORDER)[number]

type GenerationPreset = {
  id: GenerationPresetId
  label: string
  workouts: Record<string, number>
  sessions: Record<string, SessionSizeBounds>
}

function cloneSessions(source: Record<string, SessionSizeBounds>): Record<string, SessionSizeBounds> {
  return Object.fromEntries(Object.entries(source).map(([key, bounds]) => [key, { ...bounds }]))
}

// Наборы только подставляют числа. Сохранение остаётся отдельной кнопкой.
export const GENERATION_PRESETS: Record<GenerationPresetId, GenerationPreset> = {
  standard: {
    id: 'standard',
    label: 'Стандарт',
    workouts: { beginner: 3, intermediate: 3, advanced: 3 },
    sessions: cloneSessions(DEFAULT_SESSION_BOUNDS),
  },
  gentle: {
    id: 'gentle',
    label: 'Мягко',
    workouts: { beginner: 2, intermediate: 2, advanced: 3 },
    sessions: {
      default: { min: 3, max: 5 },
      beginner: { min: 2, max: 4 },
      intermediate: { min: 3, max: 5 },
      advanced: { min: 3, max: 5 },
      rehabilitation: { min: 2, max: 3 },
    },
  },
  intense: {
    id: 'intense',
    label: 'Интенсивно',
    workouts: { beginner: 4, intermediate: 5, advanced: 6 },
    sessions: {
      default: { min: 6, max: 9 },
      beginner: { min: 4, max: 6 },
      intermediate: { min: 5, max: 8 },
      advanced: { min: 6, max: 9 },
      rehabilitation: { min: 3, max: 5 },
    },
  },
}

export function applyGenerationPreset(policy: GenerationPolicy, presetId: GenerationPresetId): GenerationPolicy {
  const preset = GENERATION_PRESETS[presetId]
  return normalizeGenerationPolicy({
    ...policy,
    default_workouts_per_week: { ...preset.workouts },
    exercises_per_session: cloneSessions(preset.sessions),
  })
}

export function matchingGenerationPreset(policy: GenerationPolicy): GenerationPresetId | null {
  for (const presetId of GENERATION_PRESET_ORDER) {
    if (!isGenerationPolicyDirty(policy, applyGenerationPreset(policy, presetId))) return presetId
  }
  return null
}

/** «Новичок получит 3 тренировки в неделю по 3–5 упражнений». */
export function beginnerGeneratorExample(policy: GenerationPolicy): string {
  const workouts = policy.default_workouts_per_week.beginner ?? 3
  const bounds = policy.exercises_per_session.beginner ?? DEFAULT_SESSION_BOUNDS.beginner
  const range = bounds.min === bounds.max ? String(bounds.min) : `${bounds.min}–${bounds.max}`
  return `Новичок получит ${workouts} ${plural(workouts, WORKOUT_ACCUSATIVE)} в неделю по ${range} ${plural(bounds.max, EXERCISE_FORMS)}`
}
