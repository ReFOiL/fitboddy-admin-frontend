import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { getPlatformExercise, getTrainerExercise, listMuscles, queryKeys, replacePlanExercise } from '../api'
import { ExercisePhotoSlots } from '../components/exercises/ExercisePhotoSlots'
import { MuscleTargetPicker } from '../components/muscles/MuscleTargetPicker'
import { Button } from '../components/ui/button'
import { ScreenHeader, StickyActionBar } from '../components/ui/kit'
import { APP_PATHS } from '../config'
import { useAuth } from '../hooks/use-auth'
import { useProfile } from '../hooks/use-profile'
import { EXERCISE_PHOTO_QUERY_OPTIONS } from '../lib/exercise-photos'
import { loadSetChecks, saveSetChecks } from '../lib/plan-session'
import { getUserErrorMessage } from '../lib/user-error-message'

export function ClientExerciseDetailsPage() {
  const { user } = useAuth()
  const isClient = user?.role === 'client'
  const navigate = useNavigate()
  const { rowId } = useParams<{ rowId: string }>()
  const [searchParams] = useSearchParams()
  const trainerUserId = searchParams.get('trainer') ?? ''
  const isPlatform = !trainerUserId
  const sets = Number(searchParams.get('sets') ?? '0')
  const reps = searchParams.get('reps')
  const weight = searchParams.get('weight')
  const rest = searchParams.get('rest')
  const note = searchParams.get('note')?.trim() || ''
  const lineId = searchParams.get('line') ?? ''
  const dayId = searchParams.get('day') ?? ''
  const dayIndex = Number(searchParams.get('dayIndex') ?? '0')
  const { profileQuery } = useProfile(isClient && user?.user_id ? user.user_id : '')
  const queryClient = useQueryClient()

  const trainerExerciseQuery = useQuery({
    queryKey: queryKeys.exercises.trainerExercise(trainerUserId, rowId ?? ''),
    queryFn: async () => getTrainerExercise(trainerUserId, rowId ?? ''),
    enabled: Boolean(isClient && trainerUserId && rowId),
    retry: false,
    ...EXERCISE_PHOTO_QUERY_OPTIONS,
  })
  const platformExerciseQuery = useQuery({
    queryKey: queryKeys.exercises.platformExercise(rowId ?? ''),
    queryFn: async () => getPlatformExercise(rowId ?? ''),
    enabled: Boolean(isClient && isPlatform && rowId),
    retry: false,
    ...EXERCISE_PHOTO_QUERY_OPTIONS,
  })
  const exerciseQuery = isPlatform ? platformExerciseQuery : trainerExerciseQuery
  const exercise = exerciseQuery.data
  const hasMuscleTargets = (exercise?.primary_muscles?.length ?? 0) > 0 || (exercise?.secondary_muscles?.length ?? 0) > 0
  const musclesQuery = useQuery({
    queryKey: ['muscles-catalog'],
    queryFn: listMuscles,
    enabled: Boolean(isClient && exercise && hasMuscleTargets),
  })
  const replaceMutation = useMutation({
    mutationFn: async () => replacePlanExercise(dayIndex, lineId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['plans'] })
      toast.success('Упражнение заменено')
      navigate(-1)
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось заменить упражнение.')),
  })

  if (!isClient) return <p className="py-8 text-[17px]">Этот раздел доступен только клиентам.</p>
  if (!rowId) {
    return (
      <div className="space-y-4">
        <p className="text-[17px]">Упражнение не выбрано</p>
        <Button asChild variant="secondary">
          <Link to={APP_PATHS.planGeneration}>К плану</Link>
        </Button>
      </div>
    )
  }

  const setCount = Number.isFinite(sets) && sets > 0 ? sets : 0

  return (
    <div className="mx-auto w-full max-w-lg pb-28">
      <ScreenHeader
        title={searchParams.get('progress') || exercise?.exercise_name || 'Упражнение'}
        onBack={() => navigate(-1)}
      />
      <h1 className="mt-4 text-[28px] font-bold">{exercise?.exercise_name ?? 'Упражнение'}</h1>

      {exerciseQuery.isLoading ? <p className="mt-4 text-[17px]">Загрузка…</p> : null}
      {exerciseQuery.isError ? <p className="mt-4 text-[17px] text-destructive">Не удалось загрузить упражнение.</p> : null}

      {exercise?.video_url ? (
        <video key={exercise.video_url} src={exercise.video_url} controls className="mt-4 aspect-video w-full rounded-2xl bg-media" />
      ) : (
        <div className="mt-4 flex aspect-video w-full items-center justify-center rounded-2xl bg-media text-media-foreground">Видео</div>
      )}

      {exercise ? (
        <div className="mt-3">
          <ExercisePhotoSlots exercise={exercise} onImageError={() => void exerciseQuery.refetch()} />
          <Link to={APP_PATHS.planGeneration} className="sr-only">
            Назад к плану
          </Link>
        </div>
      ) : null}

      {exercise?.description?.trim() ? (
        <p className="mt-4 text-[17px]">
          <span className="font-semibold">Техника: </span>
          {exercise.description}
        </p>
      ) : null}

      {note ? <p className="mt-3 text-[17px]">{note}</p> : null}

      {setCount > 0 && dayId && lineId ? (
        <SetList
          dayId={dayId}
          lineId={lineId}
          total={setCount}
          reps={reps}
          weight={weight}
          rest={rest}
        />
      ) : null}

      {hasMuscleTargets && exercise ? (
        <div className="mt-6">
          <h2 className="text-[13px] font-bold uppercase">Мышцы</h2>
          {musclesQuery.isLoading ? (
            <p className="mt-2 text-[15px]">Загрузка…</p>
          ) : (
            <MuscleTargetPicker
              muscles={musclesQuery.data ?? []}
              primary={exercise.primary_muscles ?? []}
              secondary={exercise.secondary_muscles ?? []}
              bodyGender={profileQuery.data?.gender}
              readOnly
            />
          )}
        </div>
      ) : null}

      {dayIndex > 0 && lineId ? (
        <button
          type="button"
          className="mt-6 text-[17px] text-destructive"
          disabled={replaceMutation.isPending}
          onClick={() => replaceMutation.mutate()}
        >
          {replaceMutation.isPending ? 'Заменяем…' : 'Заменить упражнение'}
        </button>
      ) : null}
    </div>
  )
}

function SetList({
  dayId,
  lineId,
  total,
  reps,
  weight,
  rest,
}: {
  dayId: string
  lineId: string
  total: number
  reps: string | null
  weight: string | null
  rest: string | null
}) {
  const [checks, setChecks] = useState(() => loadSetChecks(dayId, lineId, total))
  const nextIndex = checks.findIndex((item) => !item)
  const dose = [reps ? `${reps}` : null, weight ? `${weight} кг` : null].filter(Boolean).join(' × ')

  const markNext = () => {
    const index = checks.findIndex((item) => !item)
    if (index < 0) return
    const next = checks.map((item, itemIndex) => (itemIndex === index ? true : item))
    setChecks(next)
    saveSetChecks(dayId, lineId, next)
  }

  return (
    <div className="mt-4">
      {checks.map((done, index) => (
        <button
          key={index}
          type="button"
          className="flex min-h-16 w-full items-center gap-3 border-b border-border text-left text-[17px]"
          onClick={() => {
            const next = checks.map((item, itemIndex) => (itemIndex === index ? !item : item))
            setChecks(next)
            saveSetChecks(dayId, lineId, next)
          }}
        >
          <span className={`flex h-12 w-12 items-center justify-center rounded-xl border ${done ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'}`}>
            {done ? '✓' : ''}
          </span>
          <span className="flex-1 font-semibold">Подход {index + 1}</span>
          <span>{dose || 'по плану'}</span>
        </button>
      ))}
      {rest ? <p className="mt-3 text-[15px] text-secondary-foreground">Отдых между подходами {rest} с</p> : null}
      <StickyActionBar>
        <Button type="button" size="lg" className="w-full" onClick={markNext} disabled={nextIndex < 0}>
          {nextIndex < 0 ? 'Готово' : `Подход ${nextIndex + 1} сделан`}
        </Button>
      </StickyActionBar>
    </div>
  )
}
