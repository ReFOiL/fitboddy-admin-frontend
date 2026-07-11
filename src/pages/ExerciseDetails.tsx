import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Dumbbell, Loader2, Save, Trash2, Video } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'

import { useAuth } from '../hooks/use-auth'
import { useExercises } from '../hooks/use-exercises'
import type { TrainerExercise, UpsertTrainerExerciseRequest } from '../types/exercise'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { DifficultyPicker } from '../components/ui/difficulty-picker'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Skeleton } from '../components/ui/skeleton'
import { StyledSelect } from '../components/ui/styled-select'

const exerciseSchema = z.object({
  exercise_name: z.string().min(2, 'Минимум 2 символа').max(128, 'Максимум 128 символов'),
  description: z.string().max(4000, 'Максимум 4000 символов').optional(),
  equipment: z.enum(['none', 'dumbbells', 'barbell', 'resistance_bands', 'kettlebell', 'treadmill', 'other']),
  is_cardio: z.boolean(),
  difficulty: z.number().int().min(1, 'От 1 до 5').max(5, 'От 1 до 5'),
  workout_category: z.enum(['upper', 'lower', 'core', 'full_body']),
})

type ExerciseFormValues = z.infer<typeof exerciseSchema>

const EQUIPMENT_OPTIONS: Array<{ value: ExerciseFormValues['equipment']; label: string }> = [
  { value: 'none', label: 'Без инвентаря' },
  { value: 'dumbbells', label: 'Гантели' },
  { value: 'barbell', label: 'Штанга' },
  { value: 'resistance_bands', label: 'Эспандер / резина' },
  { value: 'kettlebell', label: 'Гиря' },
  { value: 'treadmill', label: 'Беговая дорожка' },
  { value: 'other', label: 'Другое' },
]

const CATEGORY_OPTIONS: Array<{ value: ExerciseFormValues['workout_category']; label: string }> = [
  { value: 'upper', label: 'Верх тела' },
  { value: 'lower', label: 'Низ тела' },
  { value: 'core', label: 'Корпус' },
  { value: 'full_body', label: 'Все тело' },
]

const LEGACY_CATEGORY_MAP: Record<string, ExerciseFormValues['workout_category']> = {
  верх: 'upper',
  верх_тела: 'upper',
  низ: 'lower',
  низ_тела: 'lower',
  корпус: 'core',
  upper_body: 'upper',
  lower_body: 'lower',
  fullbody: 'full_body',
  все_тело: 'full_body',
  всё_тело: 'full_body',
}

const LEGACY_EQUIPMENT_MAP: Record<string, ExerciseFormValues['equipment']> = {
  bodyweight: 'none',
  no_equipment: 'none',
  dumbbell: 'dumbbells',
  bands: 'resistance_bands',
  resistance_band: 'resistance_bands',
  'resistance band': 'resistance_bands',
  kettlebells: 'kettlebell',
  беговая_дорожка: 'treadmill',
}

function normalizeEquipment(value: unknown): ExerciseFormValues['equipment'] {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized) return 'none'
  if (EQUIPMENT_OPTIONS.some((option) => option.value === normalized)) {
    return normalized as ExerciseFormValues['equipment']
  }
  return LEGACY_EQUIPMENT_MAP[normalized] ?? 'other'
}

function normalizeCategory(value: unknown): ExerciseFormValues['workout_category'] {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized) return 'full_body'
  const canonical = normalized.replace(/[\s-]+/g, '_')

  if (CATEGORY_OPTIONS.some((option) => option.value === canonical)) {
    return canonical as ExerciseFormValues['workout_category']
  }
  return LEGACY_CATEGORY_MAP[canonical] ?? 'full_body'
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
    difficulty: normalizeDifficulty(exercise.difficulty),
    workout_category: normalizeCategory(exercise.workout_category),
  }
}

function mapFormToPayload(values: ExerciseFormValues): UpsertTrainerExerciseRequest {
  const description = values.description?.trim() ?? ''
  return {
    exercise_name: values.exercise_name.trim(),
    description: description || null,
    equipment: values.equipment.trim().toLowerCase(),
    is_cardio: values.is_cardio,
    difficulty: values.difficulty,
    workout_category: values.workout_category.trim().toLowerCase(),
  }
}

export function ExerciseDetailsPage() {
  const { user } = useAuth()
  const { rowId } = useParams<{ rowId: string }>()
  const isTrainer = user?.role === 'trainer'
  const trainerUserId = isTrainer && user?.user_id ? user.user_id : ''
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
      difficulty: 2,
      workout_category: 'upper',
    },
  })

  useEffect(() => {
    form.register('equipment')
    form.register('workout_category')
    form.register('is_cardio')
    form.register('difficulty')
  }, [form])

  const watchedEquipment = useWatch({ control: form.control, name: 'equipment' })
  const watchedWorkoutCategory = useWatch({ control: form.control, name: 'workout_category' })
  const watchedDifficulty = useWatch({ control: form.control, name: 'difficulty' }) ?? 2
  const watchedIsCardio = useWatch({ control: form.control, name: 'is_cardio' })

  useEffect(() => {
    if (!exercise) return
    const nextValues = mapExerciseToFormValues(exercise)
    form.reset(nextValues)
  }, [exercise, form])

  const formDisabled = updateExerciseMutation.isPending || archiveExerciseMutation.isPending || !form.formState.isDirty
  const isVideoBusy = uploadVideoMutation.isPending || deleteVideoMutation.isPending
  const equipmentDisplayValue = watchedEquipment ?? normalizeEquipment(exercise?.equipment)
  const categoryDisplayValue = watchedWorkoutCategory ?? normalizeCategory(exercise?.workout_category)
  const exerciseTypeDisplayValue = (watchedIsCardio ?? normalizeIsCardio(exercise?.is_cardio)) ? 'cardio' : 'strength'

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

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="equipment">Инвентарь</Label>
                  <StyledSelect
                    id="equipment"
                    options={EQUIPMENT_OPTIONS}
                    value={equipmentDisplayValue}
                    onChange={(nextValue) => {
                      const normalizedValue = normalizeEquipment(nextValue)
                      form.setValue('equipment', normalizedValue, {
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
                    options={CATEGORY_OPTIONS}
                    value={categoryDisplayValue}
                    onChange={(nextValue) => {
                      const normalizedValue = normalizeCategory(nextValue)
                      form.setValue('workout_category', normalizedValue, {
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
                  <Label htmlFor="is_cardio">Тип упражнения</Label>
                  <StyledSelect
                    id="is_cardio"
                    value={exerciseTypeDisplayValue}
                    onChange={(nextValue) => {
                      const resolvedType = nextValue === 'cardio' ? 'cardio' : 'strength'
                      form.setValue('is_cardio', resolvedType === 'cardio', {
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
