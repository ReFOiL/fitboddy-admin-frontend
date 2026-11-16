import { useQuery } from '@tanstack/react-query'
import { ArchiveRestore, ArrowLeft, CheckCircle2, Dumbbell, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useWatch } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'

import { getTrainerExercise } from '../api/exercises'
import { queryKeys } from '../api/queryKeys'
import { ExerciseAccordion } from '../components/exercises/ExerciseAccordion'
import { ExerciseBasicFields, ExerciseLoadFields, ExerciseMuscleFields } from '../components/exercises/ExerciseEditorFields'
import { ExercisePhotoSlots } from '../components/exercises/ExercisePhotoSlots'
import { ExercisePlanHint } from '../components/exercises/ExercisePlanHint'
import { ExerciseVideoField } from '../components/exercises/ExerciseVideoField'
import {
  defaultExerciseFormValues,
  formatExerciseDoseLine,
  mapExerciseToFormValues,
  mapFormToPayload,
  useExerciseEditorForm,
} from '../components/exercises/exercise-form'
import { ThemeToggle } from '../components/layout/ThemeToggle'
import { StickySaveBar } from '../components/plan/StickySaveBar'
import { useAuth } from '../hooks/use-auth'
import { useExercises } from '../hooks/use-exercises'
import { useProfile } from '../hooks/use-profile'
import { useUnsavedChangesGuard } from '../hooks/use-unsaved-changes-guard'
import { EXERCISE_PHOTO_QUERY_OPTIONS } from '../lib/exercise-photos'
import { deriveWorkoutCategory, formatWorkoutCategory } from '../lib/muscles'
import { ConfirmSheet } from '../components/ui/kit'
import { Button } from '../components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'

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
    restoreExerciseMutation,
    uploadVideoMutation,
    deleteVideoMutation,
    uploadPhotoMutation,
    deletePhotoMutation,
    photoUploadProgress,
    videoUploadProgress,
  } = useExercises({
    trainerUserId,
    includeArchived: true,
  })
  const [showPlanHint, setShowPlanHint] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const exercisePhotoQuery = useQuery({
    queryKey: queryKeys.exercises.trainerExercise(trainerUserId, rowId ?? ''),
    queryFn: () => getTrainerExercise(trainerUserId, rowId ?? ''),
    enabled: Boolean(trainerUserId && rowId),
    retry: false,
    ...EXERCISE_PHOTO_QUERY_OPTIONS,
  })
  const catalog = useMemo(
    () => (Array.isArray(trainerCatalogQuery.data) ? trainerCatalogQuery.data : []),
    [trainerCatalogQuery.data],
  )
  const exercise = useMemo(
    () => (rowId ? catalog.find((item) => item.row_id === rowId) ?? null : null),
    [catalog, rowId],
  )
  const form = useExerciseEditorForm(exercise)
  const dirty = form.formState.isDirty
  useUnsavedChangesGuard(dirty && !updateExerciseMutation.isPending)

  const name = useWatch({ control: form.control, name: 'exercise_name' })
  const primary = useWatch({ control: form.control, name: 'primary_muscles' }) ?? []
  const isCardio = useWatch({ control: form.control, name: 'is_cardio' }) ?? false
  const isHold = useWatch({ control: form.control, name: 'is_hold' }) ?? false
  const reps = useWatch({ control: form.control, name: 'default_reps' })
  const duration = useWatch({ control: form.control, name: 'default_duration_seconds' })
  const weight = useWatch({ control: form.control, name: 'default_weight_kg' })
  const errors = form.formState.errors

  if (!isTrainer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell size={18} className="text-accent-ink" />
            Профиль упражнения
          </CardTitle>
          <CardDescription>Этот раздел доступен только тренерам.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!rowId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Упражнение не выбрано</CardTitle>
          <CardDescription>Откройте упражнение из каталога.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const saving = updateExerciseMutation.isPending
  const photoBusyPosition = uploadPhotoMutation.isPending
    ? uploadPhotoMutation.variables?.position ?? null
    : deletePhotoMutation.isPending
      ? deletePhotoMutation.variables?.position ?? null
      : null
  const photoBusyAction = uploadPhotoMutation.isPending ? 'upload' : deletePhotoMutation.isPending ? 'delete' : null
  const videoAction = uploadVideoMutation.isPending ? 'upload' : deleteVideoMutation.isPending ? 'delete' : null
  const basicError = Boolean(errors.exercise_name || errors.description || errors.equipment || errors.difficulty)
  const loadError = Boolean(
    errors.default_sets ||
      errors.default_reps ||
      errors.default_duration_seconds ||
      errors.default_rest_seconds ||
      errors.default_weight_kg ||
      errors.scheme_steps_input,
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button asChild type="button" variant="secondary" size="sm">
          <Link to="/exercises">
            <ArrowLeft size={14} />
            Назад к каталогу
          </Link>
        </Button>
        <ThemeToggle className="md:hidden" />
      </div>

      <header className="space-y-1">
        <h1 className="text-[28px] font-bold">{exercise?.exercise_name ?? 'Упражнение'}</h1>
        <p className="text-[15px] text-secondary-foreground">Основное, мышцы, нагрузка, фото и видео.</p>
      </header>

      {showPlanHint ? <ExercisePlanHint /> : null}
      {trainerCatalogQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
      ) : null}
      {trainerCatalogQuery.isError ? <span className="text-sm text-destructive">Не удалось загрузить каталог упражнений.</span> : null}
      {!trainerCatalogQuery.isLoading && !trainerCatalogQuery.isError && !exercise ? (
        <span className="text-sm text-secondary-foreground">Упражнение не найдено.</span>
      ) : null}

      {!trainerCatalogQuery.isLoading && !trainerCatalogQuery.isError && exercise ? (
        <form
          className="grid gap-3 pb-40 md:pb-0"
          onSubmit={form.handleSubmit((values) => {
            updateExerciseMutation.mutate(
              { rowId: exercise.row_id, payload: mapFormToPayload(values) },
              {
                onSuccess: (updatedExercise) => {
                  form.reset(mapExerciseToFormValues(updatedExercise))
                  setShowPlanHint(true)
                },
              },
            )
          })}
        >
          <ExerciseAccordion title="Основное" defaultOpen summary={name?.trim() || 'Название и описание'} forceOpen={basicError}>
            <ExerciseBasicFields form={form} />
          </ExerciseAccordion>
          <ExerciseAccordion
            title="Мышцы"
            summary={formatWorkoutCategory(deriveWorkoutCategory(primary))}
            forceOpen={false}
          >
            <ExerciseMuscleFields form={form} bodyGender={profileQuery.data?.gender} />
          </ExerciseAccordion>
          <ExerciseAccordion
            title="Нагрузка"
            summary={formatExerciseDoseLine({
              is_cardio: isCardio,
              is_hold: isHold,
              default_reps: reps ?? defaultExerciseFormValues.default_reps,
              default_duration_seconds: duration,
              default_weight_kg: weight,
            })}
            forceOpen={loadError}
          >
            <ExerciseLoadFields form={form} />
          </ExerciseAccordion>
          <ExerciseAccordion title="Фото и видео" defaultOpen summary={exercise.video_url ? 'Видео загружено' : 'Видео не загружено'}>
            <ExerciseVideoField
              videoUrl={exercise.video_url}
              action={videoAction}
              progress={uploadVideoMutation.isPending ? (videoUploadProgress ?? 0) : null}
              onUpload={(file) => uploadVideoMutation.mutate({ rowId: exercise.row_id, file })}
              onDelete={() => deleteVideoMutation.mutate(exercise.row_id)}
            />
            <ExercisePhotoSlots
              exercise={exercisePhotoQuery.data ?? exercise}
              editable
              busyPosition={photoBusyPosition}
              busyAction={photoBusyAction}
              uploadProgress={photoUploadProgress}
              onUpload={(position, file) => uploadPhotoMutation.mutate({ rowId: exercise.row_id, position, file })}
              onDelete={(position) => deletePhotoMutation.mutate({ rowId: exercise.row_id, position })}
              onImageError={() => {
                void exercisePhotoQuery.refetch()
              }}
            />
          </ExerciseAccordion>

          <div className="flex flex-wrap gap-2">
            {exercise.is_active ? (
              <Button type="button" variant="destructive" onClick={() => setArchiveOpen(true)} disabled={archiveExerciseMutation.isPending}>
                <Trash2 size={14} />
                В архив
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => restoreExerciseMutation.mutate(exercise.row_id)}
                disabled={restoreExerciseMutation.isPending}
              >
                <ArchiveRestore size={14} />
                Восстановить
              </Button>
            )}
          </div>

          <StickySaveBar ariaLabel="Сохранение упражнения">
            <div className="mx-auto flex max-w-6xl items-center gap-3">
              <span className={dirty ? 'text-sm font-medium text-foreground' : 'text-sm text-secondary-foreground'} aria-live="polite">
                {dirty ? 'Есть изменения' : 'Сохранено'}
              </span>
              {!dirty ? <CheckCircle2 size={17} className="text-accent-ink" aria-hidden /> : null}
              <Button type="submit" size="lg" className="ml-auto min-w-40" disabled={!dirty || saving}>
                {saving ? 'Сохраняем…' : 'Сохранить'}
              </Button>
            </div>
          </StickySaveBar>
        </form>
      ) : null}

      {archiveOpen && exercise?.is_active ? (
        <ConfirmSheet
          title="В архив"
          body="Архивировать упражнение? Оно не попадёт в новые планы."
          confirmLabel="В архив"
          tone="danger"
          pending={archiveExerciseMutation.isPending}
          onClose={() => setArchiveOpen(false)}
          onConfirm={() => archiveExerciseMutation.mutate(exercise.row_id, { onSuccess: () => setArchiveOpen(false) })}
        />
      ) : null}
    </div>
  )
}
