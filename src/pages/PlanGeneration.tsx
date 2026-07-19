import axios from 'axios'
import { useMemo, useState } from 'react'
import {
  Ban,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  Dumbbell,
  PackageX,
  Play,
  RefreshCw,
  Rocket,
  Scale,
  Settings2,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { APP_PATHS } from '../config'
import { useAuth } from '../hooks/use-auth'
import { useProfile } from '../hooks/use-profile'
import { useClientRelations } from '../hooks/use-relations'
import { useClientLoads, useClientPlatformLoads, usePlans } from '../hooks/use-plans'
import { listPlatformExercises, listTrainerExercises } from '../api/exercises'
import { queryKeys } from '../api/queryKeys'
import { PlanCollapsible } from '../components/plan/PlanCollapsible'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import { collectCatalogEquipmentTags, formatEquipmentLabel } from '../lib/equipment'
import { clearSessionChecks, loadSessionChecks, saveSessionChecks } from '../lib/plan-session'
import { isProfileCompleted } from '../lib/profile-completion'
import { cn } from '../lib/utils'
import type { PlanDay, PlanExercise, SetPrescription } from '../types/plan'

function textOrFallback(value: string | null | undefined): string {
  const normalized = value?.trim()
  return normalized ? normalized : 'Не указано'
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function formatWeekdayShort(dayOfWeek: number): string {
  const labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  if (dayOfWeek >= 0 && dayOfWeek <= 6) return labels[dayOfWeek]
  if (dayOfWeek >= 1 && dayOfWeek <= 7) return labels[dayOfWeek - 1]
  return '—'
}

function formatWeekday(dayOfWeek: number): string {
  const labels = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']
  if (dayOfWeek >= 0 && dayOfWeek <= 6) return labels[dayOfWeek]
  if (dayOfWeek >= 1 && dayOfWeek <= 7) return labels[dayOfWeek - 1]
  return `День ${dayOfWeek}`
}

function formatSetLine(item: SetPrescription): string {
  const parts: string[] = [`Подход ${item.set_index}`]
  if (item.duration_seconds && item.duration_seconds > 0) {
    parts.push(`${item.duration_seconds} сек`)
  } else if (item.reps && item.reps > 0) {
    parts.push(`${item.reps} повт.`)
  }
  if (item.weight_kg != null && item.weight_kg > 0) parts.push(`${item.weight_kg} кг`)
  if (item.rest_seconds) parts.push(`отдых ${item.rest_seconds} сек`)
  return parts.join(' · ')
}

function hasSetProgression(prescriptions: SetPrescription[]): boolean {
  if (prescriptions.length <= 1) return false
  const first = prescriptions[0]
  return prescriptions.some(
    (item) =>
      item.weight_kg !== first.weight_kg ||
      item.duration_seconds !== first.duration_seconds ||
      item.reps !== first.reps,
  )
}

function formatExerciseSummary(exercise: PlanExercise): string {
  const parts: string[] = []
  if (exercise.sets && exercise.sets > 0) parts.push(`${exercise.sets}×`)
  if (exercise.duration_seconds && exercise.duration_seconds > 0) {
    parts.push(`${exercise.duration_seconds} сек`)
  } else if (exercise.reps && exercise.reps > 0) {
    parts.push(`${exercise.reps} повт.`)
  }
  if (exercise.weight_kg != null && exercise.weight_kg > 0) parts.push(`${exercise.weight_kg} кг`)
  return parts.length > 0 ? parts.join(' ') : 'По программе'
}

function localTodayIso(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function exerciseDetailsTo(exerciseId: string, trainerUserId: string | null | undefined): string {
  return trainerUserId
    ? `/plan/exercises/${encodeURIComponent(exerciseId)}?trainer=${encodeURIComponent(trainerUserId)}`
    : `/plan/exercises/${encodeURIComponent(exerciseId)}`
}

export function PlanGenerationPage() {
  const { user } = useAuth()
  const isClient = user?.role === 'client'
  const clientUserId = isClient && user?.user_id ? user.user_id : ''

  const { clientActiveRelationQuery } = useClientRelations({ clientUserId })
  const {
    activePlanQuery,
    todayWorkoutQuery,
    generatePlanMutation,
    completeDayMutation,
    replaceExerciseMutation,
  } = usePlans(clientUserId)
  const { profileQuery, metaQuery, upsertMutation } = useProfile(clientUserId)

  const profile = profileQuery.data
  const questionnaireReady = isProfileCompleted(profile)
  const activeTrainerUserId = clientActiveRelationQuery.data?.trainer_user_id ?? ''
  const activeTrainerLogin = clientActiveRelationQuery.data?.trainer_login ?? null
  const activeTrainerDisplay = activeTrainerLogin?.trim() ? activeTrainerLogin : activeTrainerUserId
  const hasNoActiveRelation =
    !clientActiveRelationQuery.isLoading && !clientActiveRelationQuery.isError && !clientActiveRelationQuery.data
  const profileErrorStatus = axios.isAxiosError(profileQuery.error) ? profileQuery.error.response?.status : undefined
  const hasNoProfile = profileErrorStatus === 404
  const hasProfileError = !profileQuery.isLoading && profileQuery.isError && !hasNoProfile
  const hasRelationError = clientActiveRelationQuery.isError && !hasNoActiveRelation
  const activePlanErrorStatus = axios.isAxiosError(activePlanQuery.error)
    ? activePlanQuery.error.response?.status
    : undefined
  const hasNoActivePlan = activePlanErrorStatus === 404
  const activePlan = activePlanQuery.data
  const hasActivePlan = Boolean(!activePlanQuery.isLoading && !hasNoActivePlan && activePlan)
  const [draftWeights, setDraftWeights] = useState<Record<string, string>>({})
  const [draftPlatformWeights, setDraftPlatformWeights] = useState<Record<string, string>>({})
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionDraft, setSessionDraft] = useState<{ dayId: string; ids: Set<string> } | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)

  const trainerCatalogQuery = useQuery({
    queryKey: queryKeys.exercises.trainerCatalog(activeTrainerUserId, false),
    queryFn: async () => listTrainerExercises(activeTrainerUserId, false),
    enabled: Boolean(activeTrainerUserId),
  })
  const hasActiveTrainer = Boolean(activeTrainerUserId)
  const platformCatalogQuery = useQuery({
    queryKey: queryKeys.exercises.platformCatalog,
    queryFn: async () => listPlatformExercises(),
    enabled: Boolean(clientUserId) && !hasActiveTrainer,
  })
  const { loadsQuery, upsertLoadMutation } = useClientLoads(clientUserId, activeTrainerUserId)
  const { loadsQuery: platformLoadsQuery, upsertLoadMutation: upsertPlatformLoadMutation } =
    useClientPlatformLoads(hasActiveTrainer ? '' : clientUserId)

  const catalogEquipmentTags = useMemo(
    () => collectCatalogEquipmentTags(Array.isArray(trainerCatalogQuery.data) ? trainerCatalogQuery.data : []),
    [trainerCatalogQuery.data],
  )
  const unavailableEquipment = useMemo(
    () => (Array.isArray(profile?.unavailable_equipment) ? profile.unavailable_equipment : []),
    [profile],
  )
  const metaEquipmentTags = useMemo(
    () => (metaQuery.data?.equipment ?? []).map((item) => item.value).filter(Boolean),
    [metaQuery.data?.equipment],
  )
  const exclusionSourceTags = catalogEquipmentTags.length > 0 ? catalogEquipmentTags : metaEquipmentTags
  const exclusionOptions = useMemo(() => {
    const unavailableKeys = new Set(unavailableEquipment.map((item) => item.toLocaleLowerCase('ru-RU')))
    const fromSource = exclusionSourceTags.map((value) => ({
      value,
      label: formatEquipmentLabel(value, metaQuery.data?.equipment),
    }))
    const extras = unavailableEquipment
      .filter(
        (value) =>
          !exclusionSourceTags.some((tag) => tag.toLocaleLowerCase('ru-RU') === value.toLocaleLowerCase('ru-RU')),
      )
      .map((value) => ({
        value,
        label: formatEquipmentLabel(value, metaQuery.data?.equipment),
      }))
    return [...fromSource, ...extras].map((option) => ({
      ...option,
      selected: unavailableKeys.has(option.value.toLocaleLowerCase('ru-RU')),
    }))
  }, [exclusionSourceTags, unavailableEquipment, metaQuery.data?.equipment])

  const saveUnavailable = (next: string[]) => {
    if (!profile) return
    upsertMutation.mutate({
      full_name: profile.full_name,
      city: profile.city,
      bio: profile.bio,
      age: profile.age,
      gender: profile.gender,
      goal: profile.goal,
      experience_level: profile.experience_level,
      workout_location: profile.workout_location,
      unavailable_equipment: next,
      limitations: profile.limitations,
      medical_notes: profile.medical_notes,
    })
  }

  const weightExercises = useMemo(() => {
    const catalog = Array.isArray(trainerCatalogQuery.data) ? trainerCatalogQuery.data : []
    return catalog.filter(
      (exercise) => exercise.is_active && exercise.default_weight_kg != null && exercise.default_weight_kg > 0,
    )
  }, [trainerCatalogQuery.data])

  const platformWeightExercises = useMemo(() => {
    const catalog = Array.isArray(platformCatalogQuery.data) ? platformCatalogQuery.data : []
    return catalog.filter(
      (exercise) => exercise.is_active && exercise.default_weight_kg != null && exercise.default_weight_kg > 0,
    )
  }, [platformCatalogQuery.data])

  const loadsByExercise = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of Array.isArray(loadsQuery.data) ? loadsQuery.data : []) {
      map.set(item.exercise_row_id, item.working_weight_kg)
    }
    return map
  }, [loadsQuery.data])

  const platformLoadsByExercise = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of Array.isArray(platformLoadsQuery.data) ? platformLoadsQuery.data : []) {
      map.set(item.exercise_row_id, item.working_weight_kg)
    }
    return map
  }, [platformLoadsQuery.data])

  const missingWeightCount = weightExercises.filter((exercise) => !loadsByExercise.has(exercise.row_id)).length
  const showWeightsCta = weightExercises.length > 0 && missingWeightCount > 0
  const missingPlatformWeightCount = platformWeightExercises.filter(
    (exercise) => !platformLoadsByExercise.has(exercise.row_id),
  ).length
  const showPlatformWeightsCta = platformWeightExercises.length > 0 && missingPlatformWeightCount > 0

  const goalLabel =
    metaQuery.data?.goals.find((item) => item.value === profile?.goal)?.label ?? textOrFallback(profile?.goal)
  const levelLabel =
    metaQuery.data?.levels.find((item) => item.value === profile?.experience_level)?.label ??
    textOrFallback(profile?.experience_level)
  const locationLabel =
    metaQuery.data?.workout_locations.find((item) => item.value === profile?.workout_location)?.label ??
    textOrFallback(profile?.workout_location)

  const canGenerateBase = Boolean(
    isClient && user?.user_id && questionnaireReady && profile && !generatePlanMutation.isPending,
  )
  // С тренером — только план тренера; system доступен без тренера или если relation не удалось загрузить.
  const canGenerateSystemPlan = Boolean(
    canGenerateBase && !hasActiveTrainer && (hasNoActiveRelation || hasRelationError),
  )
  const canGenerateTrainerPlan = Boolean(canGenerateBase && hasActiveTrainer)
  const isSystemPlan = activePlan?.source === 'system'
  const planSourceLabel = isSystemPlan
    ? 'Самостоятельно'
    : activeTrainerDisplay || activePlan?.trainer_user_id || 'Тренер'
  const todayIso = localTodayIso()
  const todayWorkout = todayWorkoutQuery.data
  const todayErrorStatus = axios.isAxiosError(todayWorkoutQuery.error)
    ? todayWorkoutQuery.error.response?.status
    : undefined
  const hasNoTodayWorkout = todayErrorStatus === 404
  const todayBusy = completeDayMutation.isPending || replaceExerciseMutation.isPending
  const completedDaysCount = activePlan ? activePlan.days.filter((day) => day.is_completed).length : 0
  const totalPlanDays = activePlan?.days.length ?? 0
  const currentAdherence = totalPlanDays > 0 ? Math.round((completedDaysCount / totalPlanDays) * 100) : null
  const cycleEnded = Boolean(activePlan && todayIso > activePlan.end_date)
  const cycleFullyDone = Boolean(totalPlanDays > 0 && completedDaysCount === totalPlanDays)
  const showNextCycleCta = Boolean(hasActivePlan && (cycleEnded || cycleFullyDone))

  function runGenerate(source: 'trainer' | 'system') {
    if (!user?.user_id || !profile) return
    if (source === 'trainer' && !activeTrainerUserId) return
    if (source === 'system' && hasActiveTrainer) return
    generatePlanMutation.mutate({
      source,
      trainer_user_id: source === 'trainer' ? activeTrainerUserId : undefined,
      user_id: user.user_id,
      goal: profile.goal ?? 'maintenance',
      level: profile.experience_level ?? 'intermediate',
      workout_location: profile.workout_location ?? 'both',
      unavailable_equipment: profile.unavailable_equipment ?? [],
    })
  }

  const sortedPlanDays = useMemo(() => {
    if (!activePlan) return [] as PlanDay[]
    return [...activePlan.days].sort((left, right) => {
      if (left.week !== right.week) return left.week - right.week
      return left.day_index - right.day_index
    })
  }, [activePlan])

  const weekStripDays = useMemo(() => {
    if (sortedPlanDays.length === 0) return [] as PlanDay[]
    const todayDay = sortedPlanDays.find((day) => day.scheduled_for === todayIso)
    const week = todayDay?.week ?? todayWorkout?.week ?? sortedPlanDays[0].week
    return sortedPlanDays.filter((day) => day.week === week)
  }, [sortedPlanDays, todayIso, todayWorkout?.week])

  const focusedDay = useMemo(() => {
    if (selectedDayId) {
      return sortedPlanDays.find((day) => day.day_id === selectedDayId) ?? null
    }
    return sortedPlanDays.find((day) => day.scheduled_for === todayIso) ?? null
  }, [selectedDayId, sortedPlanDays, todayIso])

  const focusedDayId = focusedDay?.day_id ?? null
  const isFocusedToday = Boolean(focusedDay && focusedDay.scheduled_for === todayIso)

  const daysByWeek = sortedPlanDays.reduce<Record<number, PlanDay[]>>((grouped, day) => {
    if (!grouped[day.week]) grouped[day.week] = []
    grouped[day.week].push(day)
    return grouped
  }, {})
  const weekEntries = Object.entries(daysByWeek).sort(([left], [right]) => Number(left) - Number(right))
  const totalExercises = sortedPlanDays.reduce((total, day) => total + day.exercises.length, 0)
  const activeGoalLabel =
    metaQuery.data?.goals.find((item) => item.value === activePlan?.goal)?.label ?? textOrFallback(activePlan?.goal)
  const activeLevelLabel =
    metaQuery.data?.levels.find((item) => item.value === activePlan?.level)?.label ?? textOrFallback(activePlan?.level)

  const todayDayId = todayWorkout?.day_id
  const checkedLineIds =
    !todayDayId
      ? new Set<string>()
      : sessionDraft?.dayId === todayDayId
        ? sessionDraft.ids
        : loadSessionChecks(todayDayId)

  const toggleChecked = (lineId: string) => {
    if (!todayWorkout || !todayDayId || todayWorkout.is_completed) return
    const next = new Set(checkedLineIds)
    if (next.has(lineId)) next.delete(lineId)
    else next.add(lineId)
    saveSessionChecks(todayDayId, next)
    setSessionDraft({ dayId: todayDayId, ids: next })
  }

  const finishWorkout = () => {
    if (!todayWorkout || todayWorkout.is_completed) return
    completeDayMutation.mutate(todayWorkout.day_index, {
      onSuccess: () => {
        clearSessionChecks(todayWorkout.day_id)
        setSessionDraft(null)
        setSessionActive(false)
      },
    })
  }

  const checkedCount = todayWorkout
    ? todayWorkout.exercises.filter((item) => checkedLineIds.has(item.line_id)).length
    : 0
  const exerciseTotal = todayWorkout?.exercises.length ?? 0
  const inSession = Boolean(sessionActive && todayWorkout && !todayWorkout.is_completed)

  if (!isClient) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket size={18} className="text-primary" />
            Мой план
          </CardTitle>
          <CardDescription>Этот раздел доступен только клиентам.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  /* ——— Session mode ——— */
  if (inSession && todayWorkout) {
    return (
      <div className="mx-auto flex min-h-[70dvh] w-full max-w-lg flex-col gap-4 pb-28">
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setSessionActive(false)}>
            <ChevronLeft size={16} />
            Свернуть
          </Button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{formatWeekday(todayWorkout.day_of_week)}</div>
            <div className="text-xs text-secondary-foreground">
              {checkedCount}/{exerciseTotal} упражнений
            </div>
          </div>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-secondary/60">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: exerciseTotal > 0 ? `${(checkedCount / exerciseTotal) * 100}%` : '0%' }}
          />
        </div>

        <div className="space-y-3">
          {todayWorkout.exercises.map((exercise, index) => {
            const prescriptions = Array.isArray(exercise.set_prescriptions) ? exercise.set_prescriptions : []
            const showSetList = hasSetProgression(prescriptions)
            const done = checkedLineIds.has(exercise.line_id)
            const detailsTo = exerciseDetailsTo(exercise.exercise_id, todayWorkout.trainer_user_id)
            return (
              <div
                key={exercise.line_id}
                className={cn(
                  'rounded-2xl border px-3 py-3 transition',
                  done ? 'border-primary/40 bg-primary/10' : 'border-border/70 bg-secondary/15',
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    className={cn(
                      'mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold transition',
                      done
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-secondary-foreground',
                    )}
                    aria-pressed={done}
                    aria-label={done ? 'Снять отметку' : 'Отметить выполненным'}
                    onClick={() => toggleChecked(exercise.line_id)}
                  >
                    {done ? <Check size={20} /> : index + 1}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={cn('text-base font-semibold', done && 'text-secondary-foreground line-through')}>
                      {exercise.exercise_name}
                    </div>
                    {showSetList ? (
                      <ul className="mt-1 space-y-0.5 text-xs text-secondary-foreground">
                        {prescriptions.map((item) => (
                          <li key={`${exercise.line_id}-${item.set_index}`}>{formatSetLine(item)}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-1 text-xs text-secondary-foreground">{formatExerciseSummary(exercise)}</div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button asChild type="button" size="sm" variant="secondary">
                        <Link to={detailsTo}>Подробнее</Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={todayBusy}
                        onClick={() =>
                          replaceExerciseMutation.mutate({
                            dayIndex: todayWorkout.day_index,
                            lineId: exercise.line_id,
                          })
                        }
                      >
                        <RefreshCw size={14} />
                        Заменить
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border/80 bg-background/95 px-4 py-3 backdrop-blur md:bottom-0">
          <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
            <div className="text-center text-xs text-secondary-foreground">
              {checkedCount}/{exerciseTotal} готово
            </div>
            <Button type="button" size="lg" className="h-12 w-full text-base" disabled={todayBusy} onClick={finishWorkout}>
              <CheckCircle2 size={18} />
              {completeDayMutation.isPending ? 'Сохраняем…' : 'Завершить тренировку'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  /* ——— Home ——— */
  return (
    <div className="mx-auto w-full max-w-lg space-y-4 md:max-w-3xl">
      {(clientActiveRelationQuery.isLoading || profileQuery.isLoading || activePlanQuery.isLoading) &&
      !hasActivePlan &&
      !hasNoActivePlan ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : null}

      {hasNoProfile || (profile && !questionnaireReady) ? (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl">Сначала анкета</CardTitle>
            <CardDescription>Нужны цель, уровень, место тренировок, возраст и пол.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild type="button" size="lg" className="h-12 w-full">
              <Link to={APP_PATHS.profile}>Заполнить профиль</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {hasProfileError ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Не удалось загрузить профиль.
        </div>
      ) : null}

      {questionnaireReady && !hasActivePlan && !activePlanQuery.isLoading ? (
        <Card className="border-primary/30 bg-gradient-to-b from-primary/10 to-transparent">
          <CardHeader>
            <CardTitle className="text-xl">Собери план</CardTitle>
            <CardDescription>
              {activeTrainerUserId
                ? `Можно тренироваться самостоятельно или с ${activeTrainerDisplay}.`
                : 'Системный план по анкете — или выбери тренера.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2">
                <div className="text-[11px] text-secondary-foreground">Цель</div>
                <div className="font-medium">{goalLabel}</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2">
                <div className="text-[11px] text-secondary-foreground">Уровень</div>
                <div className="font-medium">{levelLabel}</div>
              </div>
              <div className="col-span-2 rounded-xl border border-border/60 bg-background/50 px-3 py-2 sm:col-span-1">
                <div className="text-[11px] text-secondary-foreground">Место</div>
                <div className="font-medium">{locationLabel}</div>
              </div>
            </div>
            {hasActiveTrainer ? (
              <Button
                type="button"
                size="lg"
                className="h-12 w-full"
                disabled={!canGenerateTrainerPlan}
                onClick={() => runGenerate('trainer')}
              >
                {generatePlanMutation.isPending ? 'Генерируем…' : 'План от тренера'}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  size="lg"
                  className="h-12 w-full"
                  disabled={!canGenerateSystemPlan}
                  onClick={() => runGenerate('system')}
                >
                  {generatePlanMutation.isPending ? 'Генерируем…' : 'Тренироваться самостоятельно'}
                </Button>
                <p className="text-center text-sm text-secondary-foreground">
                  Или{' '}
                  <Link className="text-primary underline-offset-2 hover:underline" to={APP_PATHS.trainers}>
                    выбери тренера
                  </Link>
                </p>
              </>
            )}
            {hasRelationError ? (
              <p className="text-xs text-destructive">Не удалось загрузить тренера — самостоятельный режим доступен.</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {hasActivePlan ? (
        <>
          {weekStripDays.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {weekStripDays.map((day) => {
                const isToday = day.scheduled_for === todayIso
                const isSelected = day.day_id === focusedDayId
                return (
                  <button
                    key={day.day_id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedDayId(day.day_id)}
                    className={cn(
                      'flex min-w-[3.25rem] flex-col items-center rounded-2xl border px-2.5 py-2 text-center transition',
                      isSelected
                        ? 'border-primary bg-primary/15 text-foreground ring-2 ring-primary/30'
                        : day.is_completed
                          ? 'border-border/50 bg-secondary/20 text-secondary-foreground'
                          : 'border-border/70 bg-background/60',
                      !isSelected && isToday ? 'border-primary/50' : null,
                    )}
                  >
                    <span className="text-[11px] font-medium uppercase tracking-wide">
                      {formatWeekdayShort(day.day_of_week)}
                    </span>
                    <span className="text-sm font-semibold">{formatDate(day.scheduled_for).split(' ')[0]}</span>
                    {day.is_completed ? <Check size={12} className="mt-0.5 text-primary" /> : null}
                    {isToday && !day.is_completed ? (
                      <span className="mt-0.5 text-[10px] font-semibold text-primary">сегодня</span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          ) : null}

          <Card className="overflow-hidden border-primary/25">
            <CardContent className="space-y-4 p-4 sm:p-5">
              {!focusedDay && todayWorkoutQuery.isLoading ? (
                <Skeleton className="h-28 w-full rounded-xl" />
              ) : null}

              {!focusedDay && !todayWorkoutQuery.isLoading && hasNoTodayWorkout ? (
                <div className="space-y-3 py-2 text-center">
                  <SunRestIcon />
                  <div>
                    <div className="text-lg font-semibold">День отдыха</div>
                    <p className="mt-1 text-sm text-secondary-foreground">
                      Сегодня в плане нет тренировки. Выбери день в полоске выше или открой расписание.
                    </p>
                  </div>
                </div>
              ) : null}

              {!focusedDay && !todayWorkoutQuery.isLoading && todayWorkoutQuery.isError && !hasNoTodayWorkout ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                  Не удалось загрузить тренировку на сегодня.
                </div>
              ) : null}

              {focusedDay ? (
                <>
                  <div className="space-y-1">
                    <div className="text-xs font-medium uppercase tracking-wide text-secondary-foreground">
                      {isFocusedToday ? 'Сегодня' : formatDate(focusedDay.scheduled_for)}
                    </div>
                    <div className="text-2xl font-semibold tracking-tight">
                      {formatWeekday(focusedDay.day_of_week)}
                    </div>
                    <div className="text-sm text-secondary-foreground">
                      {formatDate(focusedDay.scheduled_for)} · {planSourceLabel} · {focusedDay.exercises.length} упр.
                    </div>
                  </div>

                  {focusedDay.is_completed ? (
                    <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
                      <CheckCircle2 size={18} />
                      Тренировка выполнена
                    </div>
                  ) : isFocusedToday && todayWorkout ? (
                    <Button
                      type="button"
                      size="lg"
                      className="h-14 w-full text-base"
                      onClick={() => setSessionActive(true)}
                    >
                      <Play size={18} />
                      Начать тренировку
                    </Button>
                  ) : isFocusedToday && todayWorkoutQuery.isLoading ? (
                    <Skeleton className="h-14 w-full rounded-xl" />
                  ) : (
                    <p className="rounded-xl border border-border/60 bg-secondary/15 px-4 py-3 text-sm text-secondary-foreground">
                      {focusedDay.scheduled_for > todayIso
                        ? 'Превью будущей тренировки — начать можно в день по расписанию.'
                        : 'Просмотр прошедшей тренировки.'}
                    </p>
                  )}

                  <ul className="space-y-2">
                    {(isFocusedToday && !focusedDay.is_completed
                      ? focusedDay.exercises.slice(0, 4)
                      : focusedDay.exercises
                    ).map((exercise) => (
                      <li
                        key={exercise.line_id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-secondary/10 px-3 py-2.5 text-sm"
                      >
                        <span className="min-w-0 truncate font-medium">{exercise.exercise_name}</span>
                        <span className="shrink-0 text-xs text-secondary-foreground">
                          {formatExerciseSummary(exercise)}
                        </span>
                      </li>
                    ))}
                    {isFocusedToday && !focusedDay.is_completed && focusedDay.exercises.length > 4 ? (
                      <li className="px-1 text-xs text-secondary-foreground">
                        ещё {focusedDay.exercises.length - 4}…
                      </li>
                    ) : null}
                  </ul>
                </>
              ) : null}
            </CardContent>
          </Card>

          {showNextCycleCta ? (
            <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
              Цикл завершён{currentAdherence != null ? ` · adherence ${currentAdherence}%` : ''}. Можно запустить
              следующий в настройках ниже.
            </div>
          ) : null}

          <PlanCollapsible
            title="Настройки плана"
            subtitle="Веса, инвентарь, пересборка, расписание"
            icon={<Settings2 size={18} />}
            defaultOpen={false}
          >
            <PlanCollapsible
              title="Пересобрать план"
              subtitle={`${planSourceLabel} · ${activeGoalLabel} · ${activeLevelLabel}`}
              icon={<Rocket size={16} />}
            >
              <div className="space-y-3">
                {currentAdherence != null ? (
                  <p className="text-xs text-secondary-foreground">
                    Прогресс: {completedDaysCount}/{totalPlanDays} · {currentAdherence}%
                  </p>
                ) : null}
                {hasActiveTrainer ? (
                  <Button
                    type="button"
                    className="w-full"
                    disabled={!canGenerateTrainerPlan}
                    onClick={() => runGenerate('trainer')}
                  >
                    {generatePlanMutation.isPending
                      ? 'Генерируем…'
                      : showNextCycleCta
                        ? 'Следующий цикл'
                        : 'Пересобрать план тренера'}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      className="w-full"
                      disabled={!canGenerateSystemPlan}
                      onClick={() => runGenerate('system')}
                    >
                      {generatePlanMutation.isPending
                        ? 'Генерируем…'
                        : showNextCycleCta
                          ? 'Следующий цикл'
                          : 'Пересобрать системный'}
                    </Button>
                    <p className="text-xs text-secondary-foreground">
                      Нет тренера —{' '}
                      <Link className="text-primary underline-offset-2 hover:underline" to={APP_PATHS.trainers}>
                        выбрать
                      </Link>
                    </p>
                  </>
                )}
              </div>
            </PlanCollapsible>

            <PlanCollapsible
              title="Чего нет"
              subtitle={
                unavailableEquipment.length > 0
                  ? `Исключено: ${unavailableEquipment.length}`
                  : 'Инвентарь для исключения'
              }
              icon={<PackageX size={16} />}
            >
              {exclusionOptions.length === 0 ? (
                <p className="text-sm text-secondary-foreground">Пока нет вариантов для исключения.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {exclusionOptions.map((option) => {
                    const missing = option.selected
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={upsertMutation.isPending}
                        aria-pressed={missing}
                        onClick={() => {
                          const key = option.value.toLocaleLowerCase('ru-RU')
                          const next = missing
                            ? unavailableEquipment.filter((item) => item.toLocaleLowerCase('ru-RU') !== key)
                            : [...unavailableEquipment, option.value]
                          saveUnavailable(next)
                        }}
                        className={cn(
                          'inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm',
                          missing
                            ? 'border-destructive/35 bg-destructive/10 text-destructive'
                            : 'border-border/70 bg-background/80',
                        )}
                      >
                        {missing ? <Ban size={14} /> : null}
                        <span className={cn(missing && 'line-through')}>{option.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </PlanCollapsible>

            {!hasActiveTrainer ? (
              <PlanCollapsible
                title="Рабочие веса · система"
                subtitle={
                  showPlatformWeightsCta ? `Не заполнено: ${missingPlatformWeightCount}` : 'Для системного плана'
                }
                icon={<Scale size={16} />}
              >
                {platformCatalogQuery.isLoading || platformLoadsQuery.isLoading ? (
                  <Skeleton className="h-20 w-full rounded-xl" />
                ) : null}
                <div className="space-y-2">
                  {platformWeightExercises.map((exercise) => {
                    const saved = platformLoadsByExercise.get(exercise.row_id)
                    const draft = draftPlatformWeights[exercise.row_id]
                    const value = draft ?? (saved != null ? String(saved) : '')
                    return (
                      <div key={exercise.row_id} className="rounded-xl border border-border/60 bg-background/40 p-3">
                        <div className="text-sm font-medium">{exercise.exercise_name}</div>
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            type="number"
                            min={0.5}
                            step={0.5}
                            className="h-11 flex-1"
                            value={value}
                            placeholder={`${exercise.default_weight_kg}`}
                            onChange={(event) =>
                              setDraftPlatformWeights((current) => ({
                                ...current,
                                [exercise.row_id]: event.target.value,
                              }))
                            }
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="h-11"
                            disabled={upsertPlatformLoadMutation.isPending || !value || Number(value) <= 0}
                            onClick={() => {
                              const next = Number(value)
                              if (!Number.isFinite(next) || next <= 0) return
                              upsertPlatformLoadMutation.mutate({
                                exerciseRowId: exercise.row_id,
                                payload: { working_weight_kg: next },
                              })
                            }}
                          >
                            OK
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </PlanCollapsible>
            ) : null}

            {hasActiveTrainer ? (
              <PlanCollapsible
                title="Рабочие веса · тренер"
                subtitle={showWeightsCta ? `Не заполнено: ${missingWeightCount}` : 'Для плана тренера'}
                icon={<Scale size={16} />}
              >
                {trainerCatalogQuery.isLoading || loadsQuery.isLoading ? (
                  <Skeleton className="h-20 w-full rounded-xl" />
                ) : null}
                <div className="space-y-2">
                  {weightExercises.map((exercise) => {
                    const saved = loadsByExercise.get(exercise.row_id)
                    const draft = draftWeights[exercise.row_id]
                    const value = draft ?? (saved != null ? String(saved) : '')
                    return (
                      <div key={exercise.row_id} className="rounded-xl border border-border/60 bg-background/40 p-3">
                        <div className="text-sm font-medium">{exercise.exercise_name}</div>
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            type="number"
                            min={0.5}
                            step={0.5}
                            className="h-11 flex-1"
                            value={value}
                            placeholder={`${exercise.default_weight_kg}`}
                            onChange={(event) =>
                              setDraftWeights((current) => ({ ...current, [exercise.row_id]: event.target.value }))
                            }
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="h-11"
                            disabled={upsertLoadMutation.isPending || !value || Number(value) <= 0}
                            onClick={() => {
                              const next = Number(value)
                              if (!Number.isFinite(next) || next <= 0) return
                              upsertLoadMutation.mutate({
                                exerciseRowId: exercise.row_id,
                                payload: { working_weight_kg: next },
                              })
                            }}
                          >
                            OK
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </PlanCollapsible>
            ) : null}

            <div className="rounded-2xl border border-border/70">
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                onClick={() => setScheduleOpen((value) => !value)}
                aria-expanded={scheduleOpen}
              >
                <CalendarDays size={18} className="text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Расписание</span>
                  <span className="mt-0.5 block text-xs text-secondary-foreground">
                    {sortedPlanDays.length} тренировок · {totalExercises} упражнений
                  </span>
                </span>
                {scheduleOpen ? <X size={16} className="opacity-60" /> : <Dumbbell size={16} className="opacity-60" />}
              </button>
              {scheduleOpen ? (
                <div className="space-y-3 border-t border-border/60 px-4 py-4">
                  {weekEntries.map(([week, days]) => (
                    <div key={week} className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
                        Неделя {week}
                      </div>
                      {days.map((day) => (
                        <div
                          key={day.day_id}
                          className={cn(
                            'rounded-xl border px-3 py-2.5',
                            day.scheduled_for === todayIso ? 'border-primary/40 bg-primary/5' : 'border-border/60',
                          )}
                        >
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="font-medium">
                              {formatWeekdayShort(day.day_of_week)} · {formatDate(day.scheduled_for)}
                            </span>
                            {day.is_completed ? (
                              <CheckCircle2 size={14} className="text-primary" />
                            ) : (
                              <span className="text-xs text-secondary-foreground">{day.exercises.length} упр.</span>
                            )}
                          </div>
                          <ul className="mt-1 space-y-0.5 text-xs text-secondary-foreground">
                            {day.exercises.map((exercise) => (
                              <li key={exercise.line_id}>
                                <Link
                                  to={exerciseDetailsTo(exercise.exercise_id, activePlan?.trainer_user_id)}
                                  className="hover:text-primary"
                                >
                                  {exercise.exercise_name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </PlanCollapsible>
        </>
      ) : null}
    </div>
  )
}

function SunRestIcon() {
  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-secondary/30 text-primary">
      <CalendarDays size={26} />
    </div>
  )
}
