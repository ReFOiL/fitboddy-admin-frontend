import { zodResolver } from '@hookform/resolvers/zod'
import { Archive, Dumbbell, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'

import { useAuth } from '../hooks/use-auth'
import { useExercises } from '../hooks/use-exercises'
import type { UpsertTrainerExerciseRequest } from '../types/exercise'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { DifficultyPicker } from '../components/ui/difficulty-picker'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Skeleton } from '../components/ui/skeleton'
import { StyledSelect } from '../components/ui/styled-select'

const exerciseSchema = z
  .object({
    exercise_name: z.string().min(2, 'Минимум 2 символа').max(128, 'Максимум 128 символов'),
    description: z.string().max(4000, 'Максимум 4000 символов').optional(),
    equipment: z.enum(['none', 'dumbbells', 'barbell', 'resistance_bands', 'kettlebell', 'treadmill', 'other']),
    is_cardio: z.boolean(),
    is_hold: z.boolean(),
    difficulty: z.number().int().min(1, 'От 1 до 5').max(5, 'От 1 до 5'),
    workout_category: z.enum(['upper', 'lower', 'core', 'full_body']),
    default_sets: z.number().int().min(1, 'Минимум 1').max(10, 'Максимум 10'),
    default_reps: z.number().int().min(1, 'Минимум 1').max(100, 'Максимум 100').nullable(),
    default_duration_seconds: z.number().int().min(5, 'Минимум 5 сек').max(3600, 'Максимум 3600 сек').nullable(),
    default_rest_seconds: z.number().int().min(0, 'Минимум 0').max(600, 'Максимум 600'),
    default_weight_kg: z.number().min(0, 'Не может быть отрицательным').nullable(),
  })
  .superRefine((values, ctx) => {
    if (values.is_hold) {
      if (values.default_duration_seconds == null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['default_duration_seconds'], message: 'Укажи длительность' })
      }
    } else if (values.default_reps == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['default_reps'], message: 'Укажи повторения' })
    }
  })

type ExerciseFormValues = z.infer<typeof exerciseSchema>
type CatalogFilterMode = 'all' | 'active' | 'archived'

function formatExerciseCriteria(exercise: {
  is_cardio: boolean
  is_hold: boolean
  default_sets?: number
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

const EQUIPMENT_LABELS: Record<string, string> = {
  none: 'без инвентаря',
  dumbbells: 'гантели',
  barbell: 'штанга',
  resistance_bands: 'эспандер / резина',
  kettlebell: 'гиря',
  treadmill: 'дорожка',
  other: 'другое',
}

const EQUIPMENT_OPTIONS: Array<{ value: ExerciseFormValues['equipment']; label: string }> = [
  { value: 'none', label: 'Без инвентаря' },
  { value: 'dumbbells', label: 'Гантели' },
  { value: 'barbell', label: 'Штанга' },
  { value: 'resistance_bands', label: 'Эспандер / резина' },
  { value: 'kettlebell', label: 'Гиря' },
  { value: 'treadmill', label: 'Беговая дорожка' },
  { value: 'other', label: 'Другое' },
]

function formatEquipment(code: string): string {
  const key = code.trim().toLowerCase()
  return EQUIPMENT_LABELS[key] ?? code
}

const CATEGORY_LABELS: Record<string, string> = {
  верх: 'верх тела',
  низ: 'низ тела',
  корпус: 'корпус',
  upper: 'верх тела',
  lower: 'низ тела',
  core: 'корпус',
  full_body: 'все тело',
  lower_body: 'низ тела',
}

const CATEGORY_OPTIONS: Array<{ value: ExerciseFormValues['workout_category']; label: string }> = [
  { value: 'upper', label: 'Верх тела' },
  { value: 'lower', label: 'Низ тела' },
  { value: 'core', label: 'Корпус' },
  { value: 'full_body', label: 'Все тело' },
]

function formatCategory(value: string): string {
  const key = value.trim().toLowerCase()
  return CATEGORY_LABELS[key] ?? value
}

const defaultValues: ExerciseFormValues = {
  exercise_name: '',
  description: '',
  equipment: 'none',
  is_cardio: false,
  is_hold: false,
  difficulty: 2,
  workout_category: 'upper',
  default_sets: 3,
  default_reps: 10,
  default_duration_seconds: 35,
  default_rest_seconds: 60,
  default_weight_kg: null,
}

function mapFormToPayload(values: ExerciseFormValues): UpsertTrainerExerciseRequest {
  const description = values.description?.trim() ?? ''
  return {
    exercise_name: values.exercise_name.trim(),
    description: description || null,
    equipment: values.equipment.trim().toLowerCase(),
    is_cardio: values.is_cardio,
    is_hold: values.is_hold,
    difficulty: values.difficulty,
    workout_category: values.workout_category.trim().toLowerCase(),
    default_sets: values.default_sets,
    default_reps: values.is_hold ? null : values.default_reps,
    default_duration_seconds: values.is_hold ? values.default_duration_seconds : null,
    default_rest_seconds: values.default_rest_seconds,
    default_weight_kg: values.default_weight_kg,
  }
}

export function ExercisesPage() {
  const { user } = useAuth()
  const isTrainer = user?.role === 'trainer'
  const trainerUserId = isTrainer && user?.user_id ? user.user_id : ''
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [filterMode, setFilterMode] = useState<CatalogFilterMode>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const includeArchived = filterMode !== 'active'
  const { trainerCatalogQuery, addExerciseMutation, updateExerciseMutation, archiveExerciseMutation } = useExercises({
    trainerUserId,
    includeArchived,
  })
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const filteredCatalog = useMemo(() => {
    const catalog = Array.isArray(trainerCatalogQuery.data) ? trainerCatalogQuery.data : []
    const byStatus = catalog.filter((exercise) => {
      if (filterMode === 'active') return exercise.is_active
      if (filterMode === 'archived') return !exercise.is_active
      return true
    })
    if (!normalizedSearch) return byStatus
    return byStatus.filter((exercise) => {
      const haystack = [
        exercise.exercise_name,
        exercise.workout_category,
        exercise.equipment,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalizedSearch)
    })
  }, [filterMode, normalizedSearch, trainerCatalogQuery.data])

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues,
  })
  const watchedEquipment = useWatch({ control: form.control, name: 'equipment' }) ?? defaultValues.equipment
  const watchedWorkoutCategory = useWatch({ control: form.control, name: 'workout_category' }) ?? defaultValues.workout_category
  const watchedDifficulty = useWatch({ control: form.control, name: 'difficulty' }) ?? defaultValues.difficulty
  const watchedIsCardio = useWatch({ control: form.control, name: 'is_cardio' }) ?? false
  const watchedIsHold = useWatch({ control: form.control, name: 'is_hold' }) ?? false
  const watchedSets = useWatch({ control: form.control, name: 'default_sets' }) ?? defaultValues.default_sets
  const watchedReps = useWatch({ control: form.control, name: 'default_reps' })
  const watchedDuration = useWatch({ control: form.control, name: 'default_duration_seconds' })
  const watchedRest = useWatch({ control: form.control, name: 'default_rest_seconds' }) ?? defaultValues.default_rest_seconds
  const watchedWeight = useWatch({ control: form.control, name: 'default_weight_kg' })

  const formDisabled =
    addExerciseMutation.isPending || updateExerciseMutation.isPending || archiveExerciseMutation.isPending

  if (!isTrainer) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell size={18} className="text-primary" />
            Каталог упражнений
          </CardTitle>
          <CardDescription>Этот раздел доступен только тренерам.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell size={18} className="text-primary" />
            Каталог упражнений тренера
          </CardTitle>
          <CardDescription>
            Базовые упражнения уже добавляются автоматически. Здесь создаются новые упражнения, а редактирование доступно на отдельной странице упражнения.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isCreateFormOpen ? (
            <Button type="button" size="lg" className="min-w-56" onClick={() => setIsCreateFormOpen(true)}>
              Создать упражнение
            </Button>
          ) : (
            <form
              className="grid gap-4 rounded-xl border border-border/70 bg-secondary/20 p-4"
              onSubmit={form.handleSubmit((values) => {
                const payload = mapFormToPayload(values)
                addExerciseMutation.mutate(payload, {
                  onSuccess: () => {
                    form.reset(defaultValues)
                    setIsCreateFormOpen(false)
                  },
                })
              })}
            >
              <div className="grid gap-1.5">
                <Label htmlFor="exercise_name">Название</Label>
                <Input id="exercise_name" placeholder="Болгарские выпады" disabled={formDisabled} {...form.register('exercise_name')} />
                {form.formState.errors.exercise_name?.message ? (
                  <span className="text-xs text-destructive">{form.formState.errors.exercise_name.message}</span>
                ) : null}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="description">Описание</Label>
                <textarea
                  id="description"
                  className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/70 disabled:opacity-50"
                  placeholder="Техника, акценты, на что обратить внимание."
                  disabled={formDisabled}
                  {...form.register('description')}
                />
                {form.formState.errors.description?.message ? (
                  <span className="text-xs text-destructive">{form.formState.errors.description.message}</span>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="equipment">Инвентарь</Label>
                  <StyledSelect
                    id="equipment"
                    disabled={formDisabled}
                    options={EQUIPMENT_OPTIONS}
                    value={watchedEquipment}
                    onChange={(nextValue) => {
                      if (nextValue === form.getValues('equipment')) return
                      form.setValue('equipment', nextValue as ExerciseFormValues['equipment'], {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }}
                  />
                  {form.formState.errors.equipment?.message ? (
                    <span className="text-xs text-destructive">{form.formState.errors.equipment.message}</span>
                  ) : null}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="workout_category">Категория</Label>
                  <StyledSelect
                    id="workout_category"
                    disabled={formDisabled}
                    options={CATEGORY_OPTIONS}
                    value={watchedWorkoutCategory}
                    onChange={(nextValue) => {
                      if (nextValue === form.getValues('workout_category')) return
                      form.setValue('workout_category', nextValue as ExerciseFormValues['workout_category'], {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }}
                  />
                  {form.formState.errors.workout_category?.message ? (
                    <span className="text-xs text-destructive">{form.formState.errors.workout_category.message}</span>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="difficulty">Сложность (1-5)</Label>
                  <DifficultyPicker
                    id="difficulty"
                    value={watchedDifficulty}
                    disabled={formDisabled}
                    onChange={(nextDifficulty) => {
                      if (nextDifficulty === form.getValues('difficulty')) return
                      form.setValue('difficulty', nextDifficulty, { shouldDirty: true, shouldValidate: true })
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
                    value={watchedIsCardio ? 'cardio' : 'strength'}
                    onChange={(nextValue) => {
                      const nextIsCardio = nextValue === 'cardio'
                      if (nextIsCardio === form.getValues('is_cardio')) return
                      form.setValue('is_cardio', nextIsCardio, { shouldDirty: true, shouldValidate: true })
                    }}
                    disabled={formDisabled}
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
                  value={watchedIsHold ? 'duration' : 'reps'}
                  onChange={(nextValue) => {
                    const nextIsHold = nextValue === 'duration'
                    if (nextIsHold === form.getValues('is_hold')) return
                    form.setValue('is_hold', nextIsHold, { shouldDirty: true, shouldValidate: true })
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
                  disabled={formDisabled}
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
                    disabled={formDisabled}
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
                {watchedIsHold ? (
                  <div className="grid gap-1.5">
                    <Label htmlFor="default_duration_seconds">Длительность (сек)</Label>
                    <Input
                      id="default_duration_seconds"
                      type="number"
                      min={5}
                      max={3600}
                      disabled={formDisabled}
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
                      disabled={formDisabled}
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
                    disabled={formDisabled}
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
                    disabled={formDisabled}
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

              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="lg" className="min-w-56" disabled={formDisabled}>
                  Сохранить упражнение
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    form.reset(defaultValues)
                    setIsCreateFormOpen(false)
                  }}
                  disabled={formDisabled}
                >
                  Отмена
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive size={18} className="text-primary" />
            Список упражнений
          </CardTitle>
          <CardDescription>Фильтруй каталог по статусу и быстро ищи упражнение по ключевым словам.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-secondary/20 p-2">
            <Button
              type="button"
              size="sm"
              variant={filterMode === 'all' ? 'default' : 'secondary'}
              onClick={() => setFilterMode('all')}
            >
              Все
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filterMode === 'active' ? 'default' : 'secondary'}
              onClick={() => setFilterMode('active')}
            >
              Только активные
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filterMode === 'archived' ? 'default' : 'secondary'}
              onClick={() => setFilterMode('archived')}
            >
              Только архив
            </Button>
          </div>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9"
              placeholder="Поиск: название, ID, категория, инвентарь"
            />
          </div>

          {trainerCatalogQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : null}
          {trainerCatalogQuery.isError ? (
            <span className="text-sm text-destructive">Не удалось загрузить каталог упражнений.</span>
          ) : null}
          {!trainerCatalogQuery.isLoading && !trainerCatalogQuery.isError ? (
            <div className="space-y-3">
              {filteredCatalog.length === 0 ? (
                <span className="text-sm text-secondary-foreground">По текущим фильтрам упражнения не найдены.</span>
              ) : (
                filteredCatalog.map((exercise) => (
                  <div
                    key={exercise.row_id}
                    className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-4 text-sm"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">{exercise.exercise_name}</div>
                      <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary">
                        {exercise.is_active ? 'Активно' : 'В архиве'}
                      </div>
                    </div>
                    <div className="mb-3 text-xs text-secondary-foreground">
                      Категория: {formatCategory(exercise.workout_category)} · Инвентарь:{' '}
                      {formatEquipment(exercise.equipment)} ·
                      Сложность: {exercise.difficulty} · {formatExerciseCriteria(exercise)}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild type="button" size="sm" variant="default">
                        <Link to={`/exercises/${encodeURIComponent(exercise.row_id)}`}>
                          Подробнее
                        </Link>
                      </Button>
                      {exercise.is_active ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="gap-2"
                          onClick={() => archiveExerciseMutation.mutate(exercise.row_id)}
                          disabled={formDisabled}
                        >
                          <Trash2 size={14} />
                          В архив
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
