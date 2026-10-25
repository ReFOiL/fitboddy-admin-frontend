import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { getPlatformExercise, getTrainerExercise, listMuscles, queryKeys, replacePlanExercise } from '../api'
import { ExerciseHeroMedia } from '../components/media/ExerciseMedia'
import { MuscleTargetPicker } from '../components/muscles/MuscleTargetPicker'
import { Button } from '../components/ui/button'
import { ConfirmSheet, OverflowMenu, ScreenHeader, StickyActionBar } from '../components/ui/kit'
import { APP_PATHS } from '../config'
import { useAuth } from '../hooks/use-auth'
import { usePlans } from '../hooks/use-plans'
import { useProfile } from '../hooks/use-profile'
import { EXERCISE_PHOTO_QUERY_OPTIONS } from '../lib/exercise-photos'
import {
  clearActiveWorkoutDay,
  clearSessionChecks,
  clearWorkoutStart,
  formatRestClock,
  loadSessionChecks,
  loadSetChecks,
  loadWorkoutStart,
  markLineChecked,
  saveSetChecks,
} from '../lib/plan-session'
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
  const lineIds = (searchParams.get('lines') ?? '').split(',').filter(Boolean)
  const [replaceOpen, setReplaceOpen] = useState(false)
  const { profileQuery } = useProfile(isClient && user?.user_id ? user.user_id : '')
  const { completeDayMutation } = usePlans(isClient && user?.user_id ? user.user_id : '')
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
      setReplaceOpen(false)
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
  const canReplace = dayIndex > 0 && Boolean(lineId)
  const inWorkout = setCount > 0 && Boolean(dayId) && Boolean(lineId)
  const othersDone = lineIds.filter((id) => id !== lineId).every((id) => loadSessionChecks(dayId).has(id))
  const isLastExercise = lineIds.length > 0 && othersDone

  const finishExercise = (completeDay: boolean) => {
    if (!dayId || !lineId) return
    saveSetChecks(dayId, lineId, Array.from({ length: setCount }, () => true))
    markLineChecked(dayId, lineId)
    if (!completeDay) {
      navigate(-1)
      return
    }
    completeDayMutation.mutate(
      { dayIndex, startedAt: loadWorkoutStart(dayId) },
      {
        onSuccess: () => {
          clearSessionChecks(dayId)
          clearWorkoutStart(dayId)
          clearActiveWorkoutDay()
          navigate(APP_PATHS.home)
        },
      },
    )
  }

  return (
    <div className="mx-auto w-full max-w-lg pb-28">
      <ScreenHeader
        title={searchParams.get('progress') || exercise?.exercise_name || 'Упражнение'}
        onBack={() => navigate(-1)}
        menu={
          canReplace ? (
            <OverflowMenu
              items={[
                {
                  id: 'replace',
                  label: 'Заменить',
                  onSelect: () => setReplaceOpen(true),
                },
              ]}
            />
          ) : undefined
        }
      />
      <h1 className="mt-4 text-[28px] font-bold">{exercise?.exercise_name ?? 'Упражнение'}</h1>

      {exerciseQuery.isLoading ? <p className="mt-4 text-[17px]">Загрузка…</p> : null}
      {exerciseQuery.isError ? <p className="mt-4 text-[17px] text-destructive">Не удалось загрузить упражнение.</p> : null}

      <div className="mt-4">
        <ExerciseHeroMedia
          videoUrl={exercise?.video_url}
          startUrl={exercise?.start_image_url}
          endUrl={exercise?.end_image_url}
        />
      </div>

      {exercise?.description?.trim() ? (
        <p className="mt-4 text-[17px]">
          <span className="font-semibold">Техника: </span>
          {exercise.description}
        </p>
      ) : null}

      {note ? <p className="mt-3 text-[17px]">{note}</p> : null}

      {inWorkout ? (
        <SetRunner
          dayId={dayId}
          lineId={lineId}
          total={setCount}
          reps={reps}
          weight={weight}
          restSeconds={rest ? Number(rest) : 0}
          isLastExercise={isLastExercise}
          finishing={completeDayMutation.isPending}
          onCompleteExercise={(completeDay) => finishExercise(completeDay)}
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

      {replaceOpen ? (
        <ConfirmSheet
          title="Заменить упражнение"
          body="Поставить другое? Текущее уйдёт из сегодняшней тренировки"
          confirmLabel="Заменить"
          pending={replaceMutation.isPending}
          onClose={() => setReplaceOpen(false)}
          onConfirm={() => replaceMutation.mutate()}
        />
      ) : null}
    </div>
  )
}

function SetRunner({
  dayId,
  lineId,
  total,
  reps,
  weight,
  restSeconds,
  isLastExercise,
  finishing,
  onCompleteExercise,
}: {
  dayId: string
  lineId: string
  total: number
  reps: string | null
  weight: string | null
  restSeconds: number
  isLastExercise: boolean
  finishing: boolean
  onCompleteExercise: (completeDay: boolean) => void
}) {
  const [setIndex, setSetIndex] = useState(() => {
    const checks = loadSetChecks(dayId, lineId, total)
    const open = checks.findIndex((item) => !item)
    return open < 0 ? total - 1 : open
  })
  const [restLeft, setRestLeft] = useState<number | null>(null)
  const resting = restLeft != null && restLeft > 0
  const lastSet = setIndex >= total - 1
  const completeDay = lastSet && isLastExercise
  const dose = weight ? `${weight} кг` : 'Без веса'

  useEffect(() => {
    if (restLeft == null || restLeft <= 0) return
    const timer = window.setInterval(() => {
      setRestLeft((current) => {
        if (current == null) return current
        if (current <= 1) return 0
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [restLeft])

  const markCurrent = () => {
    const checks = loadSetChecks(dayId, lineId, total)
    checks[setIndex] = true
    saveSetChecks(dayId, lineId, checks)
  }

  const onPrimary = () => {
    if (resting || finishing) return
    markCurrent()
    if (!lastSet) {
      setSetIndex((current) => current + 1)
      if (restSeconds > 0) setRestLeft(restSeconds)
      return
    }
    onCompleteExercise(completeDay)
  }

  return (
    <div className="mt-6">
      <p className="text-[56px] font-bold leading-none">{dose}</p>
      <p className="mt-3 text-[22px] font-semibold">
        Подход {setIndex + 1} / {total}
        {reps ? <span className="ml-2 text-[17px] font-medium text-secondary-foreground">{reps} повт.</span> : null}
      </p>
      {restSeconds > 0 ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[28px] font-bold tabular-nums">{formatRestClock(resting ? restLeft ?? 0 : restLeft === 0 ? 0 : restSeconds)}</p>
          <button
            type="button"
            className="h-12 px-2 text-[17px] font-semibold underline disabled:opacity-40"
            disabled={!resting}
            onClick={() => setRestLeft(0)}
          >
            Пропустить
          </button>
        </div>
      ) : null}
      <StickyActionBar>
        <Button type="button" size="lg" className="h-12 w-full" onClick={onPrimary} disabled={resting || finishing}>
          {finishing ? 'Сохраняем…' : completeDay ? 'Завершить тренировку' : 'Готово'}
        </Button>
      </StickyActionBar>
    </div>
  )
}
