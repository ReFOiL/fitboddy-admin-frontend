import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { z } from 'zod'

import { normalizeEquipmentName, normalizeEquipmentValue } from '../../lib/equipment'
import { parseSchemeStepsInput, formatSchemeStepsInput } from '../../lib/load-schemes'
import { deriveWorkoutCategory } from '../../lib/muscles'
import type { LoadScheme, TrainerExercise, UpsertTrainerExerciseRequest } from '../../types/exercise'

export const exerciseSchema = z
  .object({
    exercise_name: z.string().min(2, 'Минимум 2 символа').max(128, 'Максимум 128 символов'),
    description: z.string().max(4000, 'Максимум 4000 символов').optional(),
    equipment: z
      .string()
      .min(2, 'Укажите инвентарь')
      .refine((value) => value.trim().toLowerCase() === 'none' || normalizeEquipmentName(value) !== null, {
        message: 'Укажите название инвентаря (2–64 символа)',
      }),
    is_cardio: z.boolean(),
    is_hold: z.boolean(),
    difficulty: z.number().int().min(1, 'От 1 до 5').max(5, 'От 1 до 5'),
    default_sets: z.number().int().min(1, 'Минимум 1').max(10, 'Максимум 10'),
    default_reps: z.number().int().min(1, 'Минимум 1').max(100, 'Максимум 100').nullable(),
    default_duration_seconds: z.number().int().min(5, 'Минимум 5 сек').max(3600, 'Максимум 3600 сек').nullable(),
    default_rest_seconds: z.number().int().min(0, 'Минимум 0').max(600, 'Максимум 600'),
    default_weight_kg: z.number().min(0, 'Не может быть отрицательным').nullable(),
    load_scheme: z.enum(['flat', 'ascending', 'descending', 'custom']),
    scheme_steps_input: z.string().optional(),
    primary_muscles: z.array(z.string()),
    secondary_muscles: z.array(z.string()),
  })
  .superRefine((values, ctx) => {
    if (values.is_hold) {
      if (values.default_duration_seconds == null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['default_duration_seconds'], message: 'Укажите длительность' })
      }
    } else if (values.default_reps == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['default_reps'], message: 'Укажите повторения' })
    }
    if (values.load_scheme === 'custom') {
      const steps = parseSchemeStepsInput(values.scheme_steps_input ?? '')
      if (steps.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scheme_steps_input'],
          message: 'Укажите коэффициенты через запятую, например 0.7, 0.85, 1',
        })
      }
    }
  })

export type ExerciseFormValues = z.infer<typeof exerciseSchema>

export const defaultExerciseFormValues: ExerciseFormValues = {
  exercise_name: '',
  description: '',
  equipment: 'none',
  is_cardio: false,
  is_hold: false,
  difficulty: 2,
  default_sets: 3,
  default_reps: 10,
  default_duration_seconds: 35,
  default_rest_seconds: 60,
  default_weight_kg: null,
  load_scheme: 'flat',
  scheme_steps_input: '',
  primary_muscles: [],
  secondary_muscles: [],
}

const CONTROLLED_FIELDS = [
  'equipment',
  'is_cardio',
  'is_hold',
  'difficulty',
  'default_sets',
  'default_reps',
  'default_duration_seconds',
  'default_rest_seconds',
  'default_weight_kg',
  'load_scheme',
  'scheme_steps_input',
  'primary_muscles',
  'secondary_muscles',
] as const satisfies ReadonlyArray<keyof ExerciseFormValues>

function normalizeDifficulty(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return 2
  return Math.min(5, Math.max(1, Math.trunc(parsed)))
}

function normalizeIsCardio(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1') return true
    if (normalized === 'false' || normalized === '0') return false
  }
  if (typeof value === 'number') return value === 1
  return false
}

export function mapExerciseToFormValues(exercise: TrainerExercise): ExerciseFormValues {
  return {
    exercise_name: typeof exercise.exercise_name === 'string' ? exercise.exercise_name : '',
    description: typeof exercise.description === 'string' ? exercise.description : '',
    equipment: normalizeEquipmentValue(exercise.equipment),
    is_cardio: normalizeIsCardio(exercise.is_cardio),
    is_hold: Boolean(exercise.is_hold),
    difficulty: normalizeDifficulty(exercise.difficulty),
    default_sets: exercise.default_sets ?? 3,
    default_reps: exercise.default_reps ?? 10,
    default_duration_seconds: exercise.default_duration_seconds ?? 35,
    default_rest_seconds: exercise.default_rest_seconds ?? 60,
    default_weight_kg: exercise.default_weight_kg ?? null,
    load_scheme: (exercise.load_scheme as LoadScheme) || 'flat',
    scheme_steps_input: formatSchemeStepsInput(exercise.scheme_steps),
    primary_muscles: Array.isArray(exercise.primary_muscles) ? [...exercise.primary_muscles] : [],
    secondary_muscles: Array.isArray(exercise.secondary_muscles) ? [...exercise.secondary_muscles] : [],
  }
}

export function mapFormToPayload(values: ExerciseFormValues): UpsertTrainerExerciseRequest {
  const description = values.description?.trim() ?? ''
  const loadScheme: LoadScheme = values.load_scheme
  return {
    exercise_name: values.exercise_name.trim(),
    description: description || null,
    equipment:
      values.equipment.trim().toLowerCase() === 'none'
        ? 'none'
        : (normalizeEquipmentName(values.equipment) ?? values.equipment.trim()),
    is_cardio: values.is_cardio,
    is_hold: values.is_hold,
    difficulty: values.difficulty,
    workout_category: deriveWorkoutCategory(values.primary_muscles),
    default_sets: values.default_sets,
    default_reps: values.is_hold ? null : values.default_reps,
    default_duration_seconds: values.is_hold ? values.default_duration_seconds : null,
    default_rest_seconds: values.default_rest_seconds,
    default_weight_kg: values.default_weight_kg,
    load_scheme: loadScheme,
    scheme_steps: loadScheme === 'custom' ? parseSchemeStepsInput(values.scheme_steps_input ?? '') : [],
    primary_muscles: values.primary_muscles,
    secondary_muscles: values.secondary_muscles,
  }
}

/** Строка дозировки в списке и в свёрнутой секции «Нагрузка». */
export function formatExerciseDoseLine(exercise: {
  is_cardio: boolean
  is_hold: boolean
  default_reps?: number | null
  default_duration_seconds?: number | null
  default_weight_kg?: number | null
}): string {
  const stimulus = exercise.is_cardio ? 'Кардио' : 'Силовое'
  const dosage = exercise.is_hold
    ? `на время${exercise.default_duration_seconds ? ` ${exercise.default_duration_seconds}с` : ''}`
    : `на повторы${exercise.default_reps ? ` ${exercise.default_reps}` : ''}`
  const weight =
    exercise.default_weight_kg != null && exercise.default_weight_kg > 0 ? `, ${exercise.default_weight_kg} кг` : ''
  return `${stimulus}, ${dosage}${weight}`
}

export function useExerciseEditorForm(exercise?: TrainerExercise | null): UseFormReturn<ExerciseFormValues> {
  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: exercise ? mapExerciseToFormValues(exercise) : defaultExerciseFormValues,
  })

  useEffect(() => {
    for (const name of CONTROLLED_FIELDS) form.register(name)
  }, [form])

  useEffect(() => {
    if (!exercise) return
    form.reset(mapExerciseToFormValues(exercise))
  }, [exercise, form])

  return form
}
