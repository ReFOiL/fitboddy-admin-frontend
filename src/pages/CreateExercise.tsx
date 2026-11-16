import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { CreateExercisePhotoField } from '../components/exercises/CreateExercisePhotoField'
import { ExerciseAccordion } from '../components/exercises/ExerciseAccordion'
import { ExerciseBasicFields, ExerciseLoadFields, ExerciseMuscleFields } from '../components/exercises/ExerciseEditorFields'
import { defaultExerciseFormValues, mapFormToPayload, useExerciseEditorForm } from '../components/exercises/exercise-form'
import { ThemeToggle } from '../components/layout/ThemeToggle'
import { StickySaveBar } from '../components/plan/StickySaveBar'
import { APP_PATHS } from '../config'
import { useAuth } from '../hooks/use-auth'
import { useExercises } from '../hooks/use-exercises'
import { useProfile } from '../hooks/use-profile'
import { useUnsavedChangesGuard } from '../hooks/use-unsaved-changes-guard'
import { EXERCISE_PHOTO_ASPECT_HINT } from '../lib/exercise-photo-crop'
import { EXERCISE_PHOTO_HINT } from '../lib/exercise-photos'
import { Button } from '../components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

export function CreateExercisePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isTrainer = user?.role === 'trainer'
  const trainerUserId = isTrainer && user?.user_id ? user.user_id : ''
  const { profileQuery } = useProfile(trainerUserId)
  const { addExerciseMutation, uploadPhotoMutation } = useExercises({
    trainerUserId,
    includeArchived: false,
  })
  const form = useExerciseEditorForm(null)
  const [startPhoto, setStartPhoto] = useState<File | null>(null)
  const [endPhoto, setEndPhoto] = useState<File | null>(null)
  const [startPreview, setStartPreview] = useState<string | null>(null)
  const [endPreview, setEndPreview] = useState<string | null>(null)
  const [nextPath, setNextPath] = useState<string | null>(null)

  const pending = addExerciseMutation.isPending || uploadPhotoMutation.isPending
  const dirty = form.formState.isDirty || startPhoto != null || endPhoto != null
  useUnsavedChangesGuard(dirty && !nextPath && !pending)

  useEffect(() => {
    if (!startPreview) return
    return () => URL.revokeObjectURL(startPreview)
  }, [startPreview])

  useEffect(() => {
    if (!endPreview) return
    return () => URL.revokeObjectURL(endPreview)
  }, [endPreview])

  useEffect(() => {
    if (!nextPath || form.formState.isDirty) return
    navigate(nextPath)
  }, [form.formState.isDirty, navigate, nextPath])

  if (!isTrainer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Новое упражнение</CardTitle>
          <CardDescription>Этот раздел доступен только тренерам.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const errors = form.formState.errors
  const basicError = Boolean(errors.exercise_name || errors.description || errors.equipment || errors.difficulty)
  const loadError = Boolean(
    errors.default_sets ||
      errors.default_reps ||
      errors.default_duration_seconds ||
      errors.default_rest_seconds ||
      errors.default_weight_kg ||
      errors.scheme_steps_input,
  )

  const replacePreview = (
    file: File | null,
    setFile: (next: File | null) => void,
    setPreview: (url: string | null) => void,
  ) => {
    setFile(file)
    setPreview(file ? URL.createObjectURL(file) : null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button asChild type="button" variant="secondary" size="sm">
          <Link to={APP_PATHS.exercises}>
            <ArrowLeft size={14} />
            К каталогу
          </Link>
        </Button>
        <ThemeToggle className="md:hidden" />
      </div>
      <h1 className="text-[28px] font-bold">Новое упражнение</h1>

      <form
        className="grid gap-3 pb-40 md:pb-0"
        onSubmit={form.handleSubmit((values) => {
          addExerciseMutation.mutate(mapFormToPayload(values), {
            onSuccess: (created) => {
              const uploads: Array<Promise<unknown>> = []
              if (startPhoto) {
                uploads.push(uploadPhotoMutation.mutateAsync({ rowId: created.row_id, position: 'start', file: startPhoto }))
              }
              if (endPhoto) {
                uploads.push(uploadPhotoMutation.mutateAsync({ rowId: created.row_id, position: 'end', file: endPhoto }))
              }
              void Promise.all(uploads).finally(() => {
                toast.success('Упражнение создано — добавьте видео')
                form.reset(defaultExerciseFormValues)
                setStartPhoto(null)
                setEndPhoto(null)
                setNextPath(`/exercises/${encodeURIComponent(created.row_id)}`)
              })
            },
          })
        })}
      >
        <ExerciseAccordion title="Основное" defaultOpen forceOpen={basicError}>
          <ExerciseBasicFields form={form} disabled={pending} />
        </ExerciseAccordion>
        <ExerciseAccordion title="Мышцы" defaultOpen>
          <ExerciseMuscleFields form={form} disabled={pending} bodyGender={profileQuery.data?.gender} />
        </ExerciseAccordion>
        <ExerciseAccordion title="Нагрузка" defaultOpen forceOpen={loadError}>
          <ExerciseLoadFields form={form} disabled={pending} />
        </ExerciseAccordion>
        <ExerciseAccordion title="Фото" defaultOpen>
          <div className="grid gap-3 sm:grid-cols-2">
            <CreateExercisePhotoField
              label="Старт"
              inputId="create_photo_start"
              preview={startPreview}
              disabled={pending}
              onFile={(file) => replacePreview(file, setStartPhoto, setStartPreview)}
            />
            <CreateExercisePhotoField
              label="Финиш"
              inputId="create_photo_end"
              preview={endPreview}
              disabled={pending}
              onFile={(file) => replacePreview(file, setEndPhoto, setEndPreview)}
            />
          </div>
          <p className="text-xs text-secondary-foreground">{EXERCISE_PHOTO_ASPECT_HINT}</p>
          <p className="text-xs text-secondary-foreground">{EXERCISE_PHOTO_HINT}</p>
        </ExerciseAccordion>

        <StickySaveBar ariaLabel="Сохранение упражнения">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <span className={dirty ? 'text-sm font-medium text-foreground' : 'text-sm text-secondary-foreground'} aria-live="polite">
              {dirty ? 'Есть изменения' : 'Заполните карточку'}
            </span>
            <Button type="submit" size="lg" className="ml-auto min-w-40" disabled={pending}>
              {pending ? 'Сохраняем…' : 'Сохранить'}
            </Button>
          </div>
        </StickySaveBar>
      </form>
    </div>
  )
}
