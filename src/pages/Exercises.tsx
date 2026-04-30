import { zodResolver } from '@hookform/resolvers/zod'
import { Dumbbell, Eye, EyeOff, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useAuth } from '../hooks/use-auth'
import { useExercises } from '../hooks/use-exercises'
import type { TrainerExercise, UpsertTrainerExerciseRequest } from '../types/exercise'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Skeleton } from '../components/ui/skeleton'

const exerciseSchema = z.object({
  exercise_id: z
    .string()
    .min(2, 'Минимум 2 символа')
    .max(64, 'Максимум 64 символа')
    .regex(/^[a-z0-9_]+$/, 'Только латиница, цифры и "_"'),
  exercise_name: z.string().min(2, 'Минимум 2 символа').max(128, 'Максимум 128 символов'),
  equipment: z.string().min(2, 'Минимум 2 символа').max(32, 'Максимум 32 символа'),
  is_cardio: z.boolean(),
  difficulty: z.number().int().min(1, 'От 1 до 5').max(5, 'От 1 до 5'),
  workout_category: z.string().min(2, 'Минимум 2 символа').max(50, 'Максимум 50 символов'),
})

type ExerciseFormValues = z.infer<typeof exerciseSchema>

const EQUIPMENT_LABELS: Record<string, string> = {
  none: 'без инвентаря',
  dumbbells: 'гантели',
  barbell: 'штанга',
  resistance_bands: 'эспандер / резина',
  kettlebell: 'гиря',
  treadmill: 'дорожка',
  other: 'другое',
}

function formatEquipment(code: string): string {
  const key = code.trim().toLowerCase()
  return EQUIPMENT_LABELS[key] ?? code
}

const CATEGORY_LABELS: Record<string, string> = {
  верх: 'верх тела',
  низ: 'низ тела',
  корпус: 'корпус',
  кардио: 'кардио',
  upper: 'верх тела',
  lower: 'низ тела',
  core: 'корпус',
  cardio: 'кардио',
  full_body: 'все тело',
  lower_body: 'низ тела',
}

function formatCategory(value: string): string {
  const key = value.trim().toLowerCase()
  return CATEGORY_LABELS[key] ?? value
}

const defaultValues: ExerciseFormValues = {
  exercise_id: '',
  exercise_name: '',
  equipment: 'none',
  is_cardio: false,
  difficulty: 2,
  workout_category: 'верх',
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

export function ExercisesPage() {
  const { user } = useAuth()
  const isTrainer = user?.role === 'trainer'
  const trainerUserId = isTrainer && user?.user_id ? user.user_id : ''
  const [includeArchived, setIncludeArchived] = useState(false)
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null)
  const { trainerCatalogQuery, addExerciseMutation, updateExerciseMutation, archiveExerciseMutation } = useExercises({
    trainerUserId,
    includeArchived,
  })
  const catalog = Array.isArray(trainerCatalogQuery.data) ? trainerCatalogQuery.data : []
  const currentEditing = useMemo(
    () => catalog.find((exercise) => exercise.exercise_id === editingExerciseId) ?? null,
    [catalog, editingExerciseId],
  )

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues,
  })

  const resetToCreateMode = () => {
    setEditingExerciseId(null)
    form.reset(defaultValues)
  }

  const fillForEdit = (exercise: TrainerExercise) => {
    setEditingExerciseId(exercise.exercise_id)
    form.reset({
      exercise_id: exercise.exercise_id,
      exercise_name: exercise.exercise_name,
      equipment: exercise.equipment,
      is_cardio: exercise.is_cardio,
      difficulty: exercise.difficulty,
      workout_category: exercise.workout_category,
    })
  }

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
            Базовые упражнения уже добавляются автоматически. Здесь можно подстроить каталог под свой стиль программирования.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid gap-4 rounded-xl border border-border/70 bg-secondary/20 p-4"
            onSubmit={form.handleSubmit((values) => {
              const payload = mapFormToPayload(values)
              if (editingExerciseId) {
                updateExerciseMutation.mutate({
                  exerciseId: editingExerciseId,
                  payload,
                })
                return
              }
              addExerciseMutation.mutate({
                exerciseId: values.exercise_id.trim().toLowerCase(),
                payload,
              })
              form.reset(defaultValues)
            })}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="exercise_id">Технический ID упражнения</Label>
              <Input
                id="exercise_id"
                placeholder="split_squat"
                disabled={Boolean(editingExerciseId) || formDisabled}
                {...form.register('exercise_id')}
              />
              {form.formState.errors.exercise_id?.message ? (
                <span className="text-xs text-destructive">{form.formState.errors.exercise_id.message}</span>
              ) : null}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="exercise_name">Название</Label>
              <Input id="exercise_name" placeholder="Болгарские выпады" disabled={formDisabled} {...form.register('exercise_name')} />
              {form.formState.errors.exercise_name?.message ? (
                <span className="text-xs text-destructive">{form.formState.errors.exercise_name.message}</span>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="equipment">Инвентарь</Label>
                <Input
                  id="equipment"
                  placeholder="напр. none, dumbbells"
                  disabled={formDisabled}
                  {...form.register('equipment')}
                />
                {form.formState.errors.equipment?.message ? (
                  <span className="text-xs text-destructive">{form.formState.errors.equipment.message}</span>
                ) : null}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="workout_category">Категория</Label>
                <Input
                  id="workout_category"
                  placeholder="напр. верх, низ, корпус, кардио"
                  disabled={formDisabled}
                  {...form.register('workout_category')}
                />
                {form.formState.errors.workout_category?.message ? (
                  <span className="text-xs text-destructive">{form.formState.errors.workout_category.message}</span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="difficulty">Сложность (1-5)</Label>
                <Input
                  id="difficulty"
                  type="number"
                  min={1}
                  max={5}
                  disabled={formDisabled}
                  {...form.register('difficulty', { valueAsNumber: true })}
                />
                {form.formState.errors.difficulty?.message ? (
                  <span className="text-xs text-destructive">{form.formState.errors.difficulty.message}</span>
                ) : null}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="is_cardio">Тип упражнения</Label>
                <select
                  id="is_cardio"
                  className="h-10 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                  value={form.watch('is_cardio') ? 'cardio' : 'strength'}
                  onChange={(event) => form.setValue('is_cardio', event.target.value === 'cardio')}
                  disabled={formDisabled}
                >
                  <option value="strength">Силовое</option>
                  <option value="cardio">Кардио</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={formDisabled}>
                {editingExerciseId ? <Save size={14} /> : <Plus size={14} />}
                {editingExerciseId ? 'Сохранить изменения' : 'Добавить упражнение'}
              </Button>
              {editingExerciseId ? (
                <Button type="button" variant="secondary" onClick={resetToCreateMode} disabled={formDisabled}>
                  Отменить редактирование
                </Button>
              ) : null}
            </div>
            {currentEditing ? (
              <span className="text-xs text-secondary-foreground">
                Сейчас редактируется: {currentEditing.exercise_name} (`{currentEditing.exercise_id}`)
              </span>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {includeArchived ? <Eye size={18} className="text-primary" /> : <EyeOff size={18} className="text-primary" />}
            Список упражнений
          </CardTitle>
          <CardDescription>Можно посмотреть только активные или полный список вместе с архивом.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={includeArchived ? 'secondary' : 'default'}
              onClick={() => setIncludeArchived(false)}
              disabled={formDisabled}
            >
              Только активные
            </Button>
            <Button
              type="button"
              variant={includeArchived ? 'default' : 'secondary'}
              onClick={() => setIncludeArchived(true)}
              disabled={formDisabled}
            >
              Показать архив
            </Button>
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
              {catalog.length === 0 ? (
                <span className="text-sm text-secondary-foreground">Пока нет упражнений по выбранному фильтру.</span>
              ) : (
                catalog.map((exercise) => (
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
                      ID: {exercise.exercise_id} · Категория: {formatCategory(exercise.workout_category)} · Инвентарь:{' '}
                      {formatEquipment(exercise.equipment)} ·
                      Сложность: {exercise.difficulty} · {exercise.is_cardio ? 'Кардио' : 'Силовое'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => fillForEdit(exercise)}
                        disabled={formDisabled}
                      >
                        <Pencil size={14} />
                        Редактировать
                      </Button>
                      {exercise.is_active ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => archiveExerciseMutation.mutate(exercise.exercise_id)}
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
