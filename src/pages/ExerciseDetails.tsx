import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Dumbbell, Save, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'

import { useAuth } from '../hooks/use-auth'
import { useExercises } from '../hooks/use-exercises'
import type { UpsertTrainerExerciseRequest } from '../types/exercise'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Skeleton } from '../components/ui/skeleton'
import { StyledSelect } from '../components/ui/styled-select'

const exerciseSchema = z.object({
  exercise_name: z.string().min(2, 'Минимум 2 символа').max(128, 'Максимум 128 символов'),
  equipment: z.enum(['none', 'dumbbells', 'barbell', 'resistance_bands', 'kettlebell', 'treadmill', 'other']),
  is_cardio: z.boolean(),
  difficulty: z.number().int().min(1, 'От 1 до 5').max(5, 'От 1 до 5'),
  workout_category: z.enum(['upper', 'lower', 'core', 'cardio', 'full_body']),
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
  { value: 'cardio', label: 'Кардио' },
  { value: 'full_body', label: 'Все тело' },
]

const LEGACY_CATEGORY_MAP: Record<string, ExerciseFormValues['workout_category']> = {
  верх: 'upper',
  низ: 'lower',
  корпус: 'core',
  кардио: 'cardio',
  lower_body: 'lower',
}

function normalizeEquipment(value: string): ExerciseFormValues['equipment'] {
  return EQUIPMENT_OPTIONS.some((option) => option.value === value)
    ? (value as ExerciseFormValues['equipment'])
    : 'other'
}

function normalizeCategory(value: string): ExerciseFormValues['workout_category'] {
  const normalized = value.trim().toLowerCase()
  if (CATEGORY_OPTIONS.some((option) => option.value === normalized)) {
    return normalized as ExerciseFormValues['workout_category']
  }
  return LEGACY_CATEGORY_MAP[normalized] ?? 'full_body'
}

function mapFormToPayload(values: ExerciseFormValues): UpsertTrainerExerciseRequest {
  return {
    exercise_name: values.exercise_name.trim(),
    equipment: values.equipment.trim().toLowerCase(),
    is_cardio: values.is_cardio,
    difficulty: values.difficulty,
    workout_category: values.workout_category.trim().toLowerCase(),
  }
}

export function ExerciseDetailsPage() {
  const { user } = useAuth()
  const { exerciseId } = useParams<{ exerciseId: string }>()
  const isTrainer = user?.role === 'trainer'
  const trainerUserId = isTrainer && user?.user_id ? user.user_id : ''
  const { trainerCatalogQuery, updateExerciseMutation, archiveExerciseMutation } = useExercises({
    trainerUserId,
    includeArchived: true,
  })
  const catalog = Array.isArray(trainerCatalogQuery.data) ? trainerCatalogQuery.data : []
  const exercise = catalog.find((item) => item.exercise_id === exerciseId) ?? null

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      exercise_name: '',
      equipment: 'none',
      is_cardio: false,
      difficulty: 2,
      workout_category: 'upper',
    },
  })

  useEffect(() => {
    if (!exercise) return
    form.reset({
      exercise_name: exercise.exercise_name,
      equipment: normalizeEquipment(exercise.equipment),
      is_cardio: exercise.is_cardio,
      difficulty: exercise.difficulty,
      workout_category: normalizeCategory(exercise.workout_category),
    })
  }, [exercise, form])

  const formDisabled = updateExerciseMutation.isPending || archiveExerciseMutation.isPending || !form.formState.isDirty

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

  if (!exerciseId) {
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
            Профиль упражнения
          </CardTitle>
          <CardDescription>Просмотр и обновление упражнения по ID: {exerciseId}</CardDescription>
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
            <span className="text-sm text-secondary-foreground">Упражнение с таким ID не найдено.</span>
          ) : null}

          {!trainerCatalogQuery.isLoading && !trainerCatalogQuery.isError && exercise ? (
            <form
              className="grid gap-4 rounded-xl border border-border/70 bg-secondary/20 p-4"
              onSubmit={form.handleSubmit((values) => {
                updateExerciseMutation.mutate({
                  exerciseId: exercise.exercise_id,
                  payload: mapFormToPayload(values),
                })
              })}
            >
              <div className="grid gap-1.5">
                <Label htmlFor="exercise_id">Технический ID упражнения</Label>
                <Input id="exercise_id" value={exercise.exercise_id} disabled />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="exercise_name">Название</Label>
                <Input id="exercise_name" placeholder="Болгарские выпады" {...form.register('exercise_name')} />
                {form.formState.errors.exercise_name?.message ? (
                  <span className="text-xs text-destructive">{form.formState.errors.exercise_name.message}</span>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="equipment">Инвентарь</Label>
                  <StyledSelect
                    id="equipment"
                    options={EQUIPMENT_OPTIONS}
                    value={form.watch('equipment')}
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
                    options={CATEGORY_OPTIONS}
                    value={form.watch('workout_category')}
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
                  <Input id="difficulty" type="number" min={1} max={5} {...form.register('difficulty', { valueAsNumber: true })} />
                  {form.formState.errors.difficulty?.message ? (
                    <span className="text-xs text-destructive">{form.formState.errors.difficulty.message}</span>
                  ) : null}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="is_cardio">Тип упражнения</Label>
                  <StyledSelect
                    id="is_cardio"
                    value={form.watch('is_cardio') ? 'cardio' : 'strength'}
                    onChange={(nextValue) => {
                      const nextIsCardio = nextValue === 'cardio'
                      if (nextIsCardio === form.getValues('is_cardio')) return
                      form.setValue('is_cardio', nextIsCardio, { shouldDirty: true, shouldValidate: true })
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
                    onClick={() => archiveExerciseMutation.mutate(exercise.exercise_id)}
                    disabled={archiveExerciseMutation.isPending}
                  >
                    <Trash2 size={14} />
                    В архив
                  </Button>
                ) : null}
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
