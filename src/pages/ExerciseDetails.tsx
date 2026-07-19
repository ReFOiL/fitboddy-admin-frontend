import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Dumbbell, Loader2, Save, Trash2, Video } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'

import { listMuscles } from '../api/exercises'
import { useAuth } from '../hooks/use-auth'
import { useExercises } from '../hooks/use-exercises'
import { useProfile } from '../hooks/use-profile'
import type { LoadScheme, TrainerExercise, UpsertTrainerExerciseRequest } from '../types/exercise'
import { normalizeEquipmentName, normalizeEquipmentValue } from '../lib/equipment'
import {
  getLoadSchemeOptions,
  formatSchemeStepsInput,
  parseSchemeStepsInput,
  previewSchemeSteps,
} from '../lib/load-schemes'
import { MuscleTargetPicker } from '../components/muscles/MuscleTargetPicker'
import { deriveWorkoutCategory, formatWorkoutCategory } from '../lib/muscles'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { DifficultyPicker } from '../components/ui/difficulty-picker'
import { EquipmentPicker } from '../components/ui/equipment-picker'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Skeleton } from '../components/ui/skeleton'
import { StyledSelect } from '../components/ui/styled-select'

const exerciseSchema = z
  .object({
    exercise_name: z.string().min(2, 'Минимум 2 символа').max(128, 'Максимум 128 символов'),
    description: z.string().max(4000, 'Максимум 4000 символов').optional(),
    equipment: z
      .string()
      .min(2, 'Укажи инвентарь')
      .refine((value) => value.trim().toLowerCase() === 'none' || normalizeEquipmentName(value) !== null, {
        message: 'Укажи название инвентаря (2–64 символа)',
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
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['default_duration_seconds'], message: 'Укажи длительность' })
      }
    } else if (values.default_reps == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['default_reps'], message: 'Укажи повторения' })
    }
    if (values.load_scheme === 'custom') {
      const steps = parseSchemeStepsInput(values.scheme_steps_input ?? '')
      if (steps.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scheme_steps_input'],
          message: 'Укажи коэффициенты через запятую, например 0.7, 0.85, 1',
        })
      }
    }
  })

type ExerciseFormValues = z.infer<typeof exerciseSchema>

function normalizeEquipment(value: unknown): string {
  return normalizeEquipmentValue(value)
}

function normalizeDifficulty(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return 2
  const bounded = Math.min(5, Math.max(1, Math.trunc(parsed)))
  return bounded
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

function mapExerciseToFormValues(exercise: TrainerExercise): ExerciseFormValues {
  return {
    exercise_name: typeof exercise.exercise_name === 'string' ? exercise.exercise_name : '',
    description: typeof exercise.description === 'string' ? exercise.description : '',
    equipment: normalizeEquipment(exercise.equipment),
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

function mapFormToPayload(values: ExerciseFormValues): UpsertTrainerExerciseRequest {
  const description = values.description?.trim() ?? ''
  const loadScheme: LoadScheme = values.load_scheme
  return {
    exercise_name: values.exercise_name.trim(),
    description: description || null,
    equipment: values.equipment.trim().toLowerCase() === 'none'
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

export function ExerciseDetailsPage() {
  const { user } = useAuth()
  const { rowId } = useParams<{ rowId: string }>()
  const isTrainer = user?.role === 'trainer'
  const trainerUserId = isTrainer && user?.user_id ? user.user_id : ''
  const { profileQuery } = useProfile(trainerUserId)
  const {
    trainerCatalogQuery,
    updateExerciseMutation,
    archiveExerciseMutation,
    uploadVideoMutation,
    deleteVideoMutation,
  } = useExercises({
    trainerUserId,
    includeArchived: true,
  })
  const catalog = useMemo(
    () => (Array.isArray(trainerCatalogQuery.data) ? trainerCatalogQuery.data : []),
    [trainerCatalogQuery.data],
  )
  const exercise = useMemo(
    () => (rowId ? catalog.find((item) => item.row_id === rowId) ?? null : null),
    [catalog, rowId],
  )

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
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
    },
  })

  useEffect(() => {
    form.register('equipment')
    form.register('is_cardio')
    form.register('is_hold')
    form.register('difficulty')
    form.register('default_sets')
    form.register('default_reps')
    form.register('default_duration_seconds')
    form.register('default_rest_seconds')
    form.register('default_weight_kg')
    form.register('load_scheme')
    form.register('scheme_steps_input')
    form.register('primary_muscles')
    form.register('secondary_muscles')
  }, [form])

  const watchedEquipment = useWatch({ control: form.control, name: 'equipment' })
  const watchedDifficulty = useWatch({ control: form.control, name: 'difficulty' }) ?? 2
  const watchedIsCardio = useWatch({ control: form.control, name: 'is_cardio' })
  const watchedIsHold = useWatch({ control: form.control, name: 'is_hold' })
  const watchedSets = useWatch({ control: form.control, name: 'default_sets' }) ?? 3
  const watchedReps = useWatch({ control: form.control, name: 'default_reps' })
  const watchedDuration = useWatch({ control: form.control, name: 'default_duration_seconds' })
  const watchedRest = useWatch({ control: form.control, name: 'default_rest_seconds' }) ?? 60
  const watchedWeight = useWatch({ control: form.control, name: 'default_weight_kg' })
  const watchedLoadScheme = useWatch({ control: form.control, name: 'load_scheme' }) ?? 'flat'
  const watchedSchemeStepsInput = useWatch({ control: form.control, name: 'scheme_steps_input' }) ?? ''
  const watchedPrimaryMuscles = useWatch({ control: form.control, name: 'primary_muscles' }) ?? []
  const watchedSecondaryMuscles = useWatch({ control: form.control, name: 'secondary_muscles' }) ?? []
  const musclesQuery = useQuery({
    queryKey: ['muscles-catalog'],
    queryFn: listMuscles,
  })
  const schemePreview = previewSchemeSteps(
    watchedLoadScheme,
    watchedSets,
    parseSchemeStepsInput(watchedSchemeStepsInput),
  )

  useEffect(() => {
    if (!exercise) return
    const nextValues = mapExerciseToFormValues(exercise)
    form.reset(nextValues)
  }, [exercise, form])

  const formDisabled = updateExerciseMutation.isPending || archiveExerciseMutation.isPending || !form.formState.isDirty
  const isVideoBusy = uploadVideoMutation.isPending || deleteVideoMutation.isPending
  const equipmentDisplayValue = watchedEquipment ?? normalizeEquipment(exercise?.equipment)
  const stimulusDisplayValue =
    (watchedIsCardio ?? normalizeIsCardio(exercise?.is_cardio)) ? 'cardio' : 'strength'
  const dosageDisplayValue = (watchedIsHold ?? Boolean(exercise?.is_hold)) ? 'duration' : 'reps'

  if (!isTrainer) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell size={18} className="text-primary" />
            Профиль упражнения
          </CardTitle>
          <CardDescription>Этот раздел доступен только тренерам.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!rowId) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>Упражнение не выбрано</CardTitle>
          <CardDescription>Откройте упражнение из каталога.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Button asChild type="button" variant="secondary" size="sm">
        <Link to="/exercises">
          <ArrowLeft size={14} />
          Назад к каталогу
        </Link>
      </Button>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell size={18} className="text-primary" />
            {exercise?.exercise_name ?? 'Профиль упражнения'}
          </CardTitle>
          <CardDescription>Редактирование упражнения из каталога.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {trainerCatalogQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : null}
          {trainerCatalogQuery.isError ? (
            <span className="text-sm text-destructive">Не удалось загрузить каталог упражнений.</span>
          ) : null}
          {!trainerCatalogQuery.isLoading && !trainerCatalogQuery.isError && !exercise ? (
            <span className="text-sm text-secondary-foreground">Упражнение не найдено.</span>
          ) : null}

          {!trainerCatalogQuery.isLoading && !trainerCatalogQuery.isError && exercise ? (
            <form
              className="grid gap-4 rounded-xl border border-border/70 bg-secondary/20 p-4"
              onSubmit={form.handleSubmit((values) => {
                updateExerciseMutation.mutate({
                  rowId: exercise.row_id,
                  payload: mapFormToPayload(values),
                }, {
                  onSuccess: (updatedExercise) => {
                    const nextValues = mapExerciseToFormValues(updatedExercise)
                    form.reset(nextValues)
                  },
                })
              })}
            >
              <div className="grid gap-1.5">
                <Label htmlFor="exercise_name">Название</Label>
                <Input id="exercise_name" placeholder="Болгарские выпады" {...form.register('exercise_name')} />
                {form.formState.errors.exercise_name?.message ? (
                  <span className="text-xs text-destructive">{form.formState.errors.exercise_name.message}</span>
                ) : null}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="description">Описание</Label>
                <textarea
                  id="description"
                  className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/70"
                  placeholder="Техника, акценты, на что обратить внимание."
                  {...form.register('description')}
                />
                {form.formState.errors.description?.message ? (
                  <span className="text-xs text-destructive">{form.formState.errors.description.message}</span>
                ) : null}
              </div>

              <div className="grid gap-2 rounded-xl border border-border/70 bg-secondary/15 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label>Группы мышц</Label>
                  <span className="text-xs text-secondary-foreground">
                    Категория: {formatWorkoutCategory(deriveWorkoutCategory(watchedPrimaryMuscles))}
                  </span>
                </div>
                <p className="text-xs text-secondary-foreground">
                  Кликни по силуэту или выбери из списка — основные и вспомогательные мышцы. Категория
                  считается автоматически по основным.
                </p>
                {musclesQuery.isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <MuscleTargetPicker
                    muscles={musclesQuery.data ?? []}
                    primary={watchedPrimaryMuscles}
                    secondary={watchedSecondaryMuscles}
                    bodyGender={profileQuery.data?.gender}
                    onChange={({ primary, secondary }) => {
                      form.setValue('primary_muscles', primary, { shouldDirty: true, shouldValidate: true })
                      form.setValue('secondary_muscles', secondary, { shouldDirty: true, shouldValidate: true })
                    }}
                  />
                )}
              </div>

              <EquipmentPicker
                id="equipment"
                value={equipmentDisplayValue}
                error={form.formState.errors.equipment?.message}
                onChange={(nextValue) => {
                  form.setValue('equipment', nextValue, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="difficulty">Сложность (1-5)</Label>
                  <DifficultyPicker
                    id="difficulty"
                    value={watchedDifficulty}
                    onChange={(nextDifficulty) => {
                      if (nextDifficulty === form.getValues('difficulty')) return
                      form.setValue('difficulty', nextDifficulty, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }}
                  />
                  {form.formState.errors.difficulty?.message ? (
                    <span className="text-xs text-destructive">{form.formState.errors.difficulty.message}</span>
                  ) : null}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="is_cardio">Тип нагрузки</Label>
                  <StyledSelect
                    id="is_cardio"
                    value={stimulusDisplayValue}
                    onChange={(nextValue) => {
                      form.setValue('is_cardio', nextValue === 'cardio', {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }}
                    options={[
                      { value: 'strength', label: 'Силовое' },
                      { value: 'cardio', label: 'Кардио' },
                    ]}
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="is_hold">Дозировка</Label>
                <StyledSelect
                  id="is_hold"
                  value={dosageDisplayValue}
                  onChange={(nextValue) => {
                    const nextIsHold = nextValue === 'duration'
                    form.setValue('is_hold', nextIsHold, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                    if (nextIsHold) {
                      form.setValue('default_rest_seconds', 45, { shouldDirty: true, shouldValidate: true })
                      if (!form.getValues('default_duration_seconds')) {
                        form.setValue('default_duration_seconds', 35, { shouldDirty: true, shouldValidate: true })
                      }
                    } else {
                      form.setValue('default_rest_seconds', 60, { shouldDirty: true, shouldValidate: true })
                      if (!form.getValues('default_reps')) {
                        form.setValue('default_reps', 10, { shouldDirty: true, shouldValidate: true })
                      }
                    }
                  }}
                  options={[
                    { value: 'reps', label: 'На повторы' },
                    { value: 'duration', label: 'На время' },
                  ]}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="default_sets">Подходы</Label>
                  <Input
                    id="default_sets"
                    type="number"
                    min={1}
                    max={10}
                    value={watchedSets}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value)
                      form.setValue('default_sets', Number.isFinite(nextValue) ? nextValue : 1, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }}
                  />
                  {form.formState.errors.default_sets?.message ? (
                    <span className="text-xs text-destructive">{form.formState.errors.default_sets.message}</span>
                  ) : null}
                </div>
                {dosageDisplayValue === 'duration' ? (
                  <div className="grid gap-1.5">
                    <Label htmlFor="default_duration_seconds">Длительность (сек)</Label>
                    <Input
                      id="default_duration_seconds"
                      type="number"
                      min={5}
                      max={3600}
                      value={watchedDuration ?? ''}
                      onChange={(event) => {
                        const raw = event.target.value
                        form.setValue('default_duration_seconds', raw === '' ? null : Number(raw), {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }}
                    />
                    {form.formState.errors.default_duration_seconds?.message ? (
                      <span className="text-xs text-destructive">{form.formState.errors.default_duration_seconds.message}</span>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid gap-1.5">
                    <Label htmlFor="default_reps">Повторения</Label>
                    <Input
                      id="default_reps"
                      type="number"
                      min={1}
                      max={100}
                      value={watchedReps ?? ''}
                      onChange={(event) => {
                        const raw = event.target.value
                        form.setValue('default_reps', raw === '' ? null : Number(raw), {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }}
                    />
                    {form.formState.errors.default_reps?.message ? (
                      <span className="text-xs text-destructive">{form.formState.errors.default_reps.message}</span>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="default_rest_seconds">Отдых (сек)</Label>
                  <Input
                    id="default_rest_seconds"
                    type="number"
                    min={0}
                    max={600}
                    value={watchedRest}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value)
                      form.setValue('default_rest_seconds', Number.isFinite(nextValue) ? nextValue : 0, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }}
                  />
                  {form.formState.errors.default_rest_seconds?.message ? (
                    <span className="text-xs text-destructive">{form.formState.errors.default_rest_seconds.message}</span>
                  ) : null}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="default_weight_kg">Базовый вес (кг)</Label>
                  <Input
                    id="default_weight_kg"
                    type="number"
                    min={0}
                    step={0.5}
                    value={watchedWeight ?? ''}
                    placeholder="Необязательно"
                    onChange={(event) => {
                      const raw = event.target.value
                      form.setValue('default_weight_kg', raw === '' ? null : Number(raw), {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }}
                  />
                  {form.formState.errors.default_weight_kg?.message ? (
                    <span className="text-xs text-destructive">{form.formState.errors.default_weight_kg.message}</span>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 rounded-xl border border-border/70 bg-secondary/15 p-3">
                <div className="grid gap-1.5">
                  <Label>Схема подходов</Label>
                  <StyledSelect
                    value={watchedLoadScheme}
                    onChange={(value) =>
                      form.setValue('load_scheme', value as LoadScheme, { shouldDirty: true, shouldValidate: true })
                    }
                    options={getLoadSchemeOptions(Boolean(watchedIsHold))}
                  />
                </div>
                {watchedLoadScheme === 'custom' ? (
                  <div className="grid gap-1.5">
                    <Label htmlFor="scheme_steps_input">
                      {watchedIsHold
                        ? 'Коэффициенты от базовой длительности'
                        : 'Коэффициенты от рабочего веса'}
                    </Label>
                    <Input
                      id="scheme_steps_input"
                      value={watchedSchemeStepsInput}
                      placeholder="0.7, 0.85, 1, 1.05"
                      onChange={(event) =>
                        form.setValue('scheme_steps_input', event.target.value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    />
                    {form.formState.errors.scheme_steps_input?.message ? (
                      <span className="text-xs text-destructive">{form.formState.errors.scheme_steps_input.message}</span>
                    ) : null}
                  </div>
                ) : null}
                <div className="text-xs text-secondary-foreground">
                  Превью: {schemePreview.map((step, index) => `П${index + 1}×${step}`).join(' · ')}
                  {watchedIsHold && watchedDuration != null && watchedDuration > 0
                    ? ` → ${schemePreview.map((step) => `${Math.round(watchedDuration * step)} сек`).join(', ')}`
                    : !watchedIsHold && watchedWeight != null && watchedWeight > 0
                      ? ` → ${schemePreview
                          .map((step) => `${Math.round((watchedWeight * step) / 2.5) * 2.5} кг`)
                          .join(', ')}`
                      : ''}
                  {watchedIsHold && watchedWeight != null && watchedWeight > 0
                    ? ` · вес ${watchedWeight} кг на все подходы`
                    : ''}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={formDisabled}>
                  <Save size={14} />
                  Сохранить изменения
                </Button>
                {exercise.is_active ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className="gap-2"
                    onClick={() => archiveExerciseMutation.mutate(exercise.row_id)}
                    disabled={archiveExerciseMutation.isPending}
                  >
                    <Trash2 size={14} />
                    В архив
                  </Button>
                ) : null}
              </div>
            </form>
          ) : null}

          {!trainerCatalogQuery.isLoading && !trainerCatalogQuery.isError && exercise ? (
            <div className="relative grid gap-3 rounded-xl border border-border/70 bg-secondary/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Video size={16} className="text-primary" />
                Видео упражнения
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="exercise_video_upload">Загрузить видео</Label>
                <Input
                  id="exercise_video_upload"
                  type="file"
                  accept=".mp4,.mov,video/mp4,video/quicktime"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    uploadVideoMutation.mutate({ rowId: exercise.row_id, file })
                    event.currentTarget.value = ''
                  }}
                  disabled={isVideoBusy}
                />
                <span className="text-xs text-secondary-foreground">Поддерживаются MP4/MOV, до 200MB.</span>
              </div>
              {isVideoBusy ? (
                <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
                  <Loader2 size={18} className="animate-spin text-primary" />
                  <div>
                    <div className="font-medium">
                      {uploadVideoMutation.isPending ? 'Загружаем видео...' : 'Удаляем видео...'}
                    </div>
                    <div className="text-xs text-secondary-foreground">
                      {uploadVideoMutation.isPending
                        ? 'Большие файлы могут загружаться до нескольких минут. Не закрывай страницу.'
                        : 'Подожди немного.'}
                    </div>
                  </div>
                </div>
              ) : null}
              {exercise.video_url ? (
                <div className={`space-y-3 ${isVideoBusy ? 'pointer-events-none opacity-50' : ''}`}>
                  <video
                    key={exercise.video_url}
                    src={exercise.video_url}
                    controls
                    className="max-h-72 w-full rounded-xl border border-border/60 bg-background/40"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => deleteVideoMutation.mutate(exercise.row_id)}
                    disabled={isVideoBusy}
                  >
                    {deleteVideoMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    {deleteVideoMutation.isPending ? 'Удаление...' : 'Удалить видео'}
                  </Button>
                </div>
              ) : !isVideoBusy ? (
                <span className="text-sm text-secondary-foreground">Видео ещё не загружено.</span>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
