import axios from 'axios'
import { useMemo, useState } from 'react'
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  PackageX,
  RefreshCw,
  Rocket,
  Scale,
  Sun,
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
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import { collectCatalogEquipmentTags, formatEquipmentLabel } from '../lib/equipment'
import { isProfileCompleted } from '../lib/profile-completion'
import { cn } from '../lib/utils'
import type { PlanExercise, SetPrescription } from '../types/plan'

function textOrFallback(value: string | null | undefined): string {
  const normalized = value?.trim()
  return normalized ? normalized : 'Не указано'
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('ru-RU')
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
  if (exercise.sets && exercise.sets > 0) parts.push(`Подходы: ${exercise.sets}`)
  if (exercise.duration_seconds && exercise.duration_seconds > 0) {
    parts.push(`Длительность: ${exercise.duration_seconds} сек`)
  } else if (exercise.reps && exercise.reps > 0) {
    parts.push(`Повторения: ${exercise.reps}`)
  }
  if (exercise.weight_kg != null && exercise.weight_kg > 0) parts.push(`Вес: ${exercise.weight_kg} кг`)
  if (exercise.rest_seconds) parts.push(`Отдых: ${exercise.rest_seconds} сек`)
  return parts.length > 0 ? parts.join(' · ') : 'Параметры по программе'
}

function localTodayIso(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
  const activePlanErrorStatus = axios.isAxiosError(activePlanQuery.error) ? activePlanQuery.error.response?.status : undefined
  const hasNoActivePlan = activePlanErrorStatus === 404
  const activePlan = activePlanQuery.data
  const hasActivePlan = Boolean(!activePlanQuery.isLoading && !hasNoActivePlan && activePlan)
  const [generationPanelOverride, setGenerationPanelOverride] = useState<boolean | null>(null)
  const isGenerationPanelOpen = generationPanelOverride ?? !hasActivePlan
  const [draftWeights, setDraftWeights] = useState<Record<string, string>>({})
  const [draftPlatformWeights, setDraftPlatformWeights] = useState<Record<string, string>>({})

  const trainerCatalogQuery = useQuery({
    queryKey: queryKeys.exercises.trainerCatalog(activeTrainerUserId, false),
    queryFn: async () => listTrainerExercises(activeTrainerUserId, false),
    enabled: Boolean(activeTrainerUserId),
  })
  const platformCatalogQuery = useQuery({
    queryKey: queryKeys.exercises.platformCatalog,
    queryFn: async () => listPlatformExercises(),
    enabled: Boolean(clientUserId),
  })
  const { loadsQuery, upsertLoadMutation } = useClientLoads(clientUserId, activeTrainerUserId)
  const { loadsQuery: platformLoadsQuery, upsertLoadMutation: upsertPlatformLoadMutation } =
    useClientPlatformLoads(clientUserId)

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
      .filter((value) => !exclusionSourceTags.some((tag) => tag.toLocaleLowerCase('ru-RU') === value.toLocaleLowerCase('ru-RU')))
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
      (exercise) =>
        exercise.is_active && exercise.default_weight_kg != null && exercise.default_weight_kg > 0,
    )
  }, [trainerCatalogQuery.data])

  const platformWeightExercises = useMemo(() => {
    const catalog = Array.isArray(platformCatalogQuery.data) ? platformCatalogQuery.data : []
    return catalog.filter(
      (exercise) =>
        exercise.is_active && exercise.default_weight_kg != null && exercise.default_weight_kg > 0,
    )
  }, [platformCatalogQuery.data])

  const loadsByExercise = useMemo(() => {
    const map = new Map<string, number>()
    const loads = Array.isArray(loadsQuery.data) ? loadsQuery.data : []
    for (const item of loads) {
      map.set(item.exercise_row_id, item.working_weight_kg)
    }
    return map
  }, [loadsQuery.data])

  const platformLoadsByExercise = useMemo(() => {
    const map = new Map<string, number>()
    const loads = Array.isArray(platformLoadsQuery.data) ? platformLoadsQuery.data : []
    for (const item of loads) {
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
    metaQuery.data?.levels.find((item) => item.value === profile?.experience_level)?.label ?? textOrFallback(profile?.experience_level)
  const locationLabel =
    metaQuery.data?.workout_locations.find((item) => item.value === profile?.workout_location)?.label ??
    textOrFallback(profile?.workout_location)

  const canGenerateSystemPlan = Boolean(
    isClient && user?.user_id && questionnaireReady && profile && !generatePlanMutation.isPending,
  )
  const canGenerateTrainerPlan = Boolean(canGenerateSystemPlan && activeTrainerUserId)
  const isSystemPlan = activePlan?.source === 'system'
  const planSourceLabel = isSystemPlan
    ? 'Самостоятельно (система)'
    : activeTrainerDisplay || activePlan?.trainer_user_id || 'Тренер'
  const todayIso = localTodayIso()
  const todayWorkout = todayWorkoutQuery.data
  const todayErrorStatus = axios.isAxiosError(todayWorkoutQuery.error)
    ? todayWorkoutQuery.error.response?.status
    : undefined
  const hasNoTodayWorkout = todayErrorStatus === 404
  const todayBusy = completeDayMutation.isPending || replaceExerciseMutation.isPending
  const completedDaysCount = activePlan
    ? activePlan.days.filter((day) => day.is_completed).length
    : 0
  const totalPlanDays = activePlan?.days.length ?? 0
  const currentAdherence =
    totalPlanDays > 0 ? Math.round((completedDaysCount / totalPlanDays) * 100) : null
  const cycleEnded = Boolean(activePlan && todayIso > activePlan.end_date)
  const cycleFullyDone = Boolean(totalPlanDays > 0 && completedDaysCount === totalPlanDays)
  const showNextCycleCta = Boolean(hasActivePlan && (cycleEnded || cycleFullyDone))

  function runGenerate(source: 'trainer' | 'system') {
    if (!user?.user_id || !profile) return
    if (source === 'trainer' && !activeTrainerUserId) return
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
  const sortedPlanDays = activePlan
    ? [...activePlan.days].sort((left, right) => {
        if (left.week !== right.week) return left.week - right.week
        return left.day_index - right.day_index
      })
    : []
  const daysByWeek = sortedPlanDays.reduce<Record<number, typeof sortedPlanDays>>((grouped, day) => {
    if (!grouped[day.week]) {
      grouped[day.week] = []
    }
    grouped[day.week].push(day)
    return grouped
  }, {})
  const weekEntries = Object.entries(daysByWeek).sort(([left], [right]) => Number(left) - Number(right))
  const totalExercises = sortedPlanDays.reduce((total, day) => total + day.exercises.length, 0)
  const activeGoalLabel =
    metaQuery.data?.goals.find((item) => item.value === activePlan?.goal)?.label ?? textOrFallback(activePlan?.goal)
  const activeLevelLabel =
    metaQuery.data?.levels.find((item) => item.value === activePlan?.level)?.label ?? textOrFallback(activePlan?.level)

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

  return (
    <div className="space-y-6">
      <Card id="plan-generation-panel" className="border-primary/20">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <Rocket size={18} className="text-primary" />
              План из анкеты
            </CardTitle>
            <CardDescription>
              Можно тренироваться самостоятельно или с тренером. Параметры берутся из профиля.
            </CardDescription>
          </div>
          {hasActivePlan ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setGenerationPanelOverride((current) => !(current ?? false))}
            >
              {isGenerationPanelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {isGenerationPanelOpen ? 'Скрыть' : 'Показать'}
            </Button>
          ) : null}
        </CardHeader>
        {isGenerationPanelOpen ? (
          <CardContent className="space-y-4">
            {clientActiveRelationQuery.isLoading || profileQuery.isLoading ? <Skeleton className="h-24 w-full rounded-xl" /> : null}
            {hasRelationError ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                Не удалось загрузить активного тренера. Самостоятельный режим всё равно доступен.
              </div>
            ) : null}
            {hasNoProfile ? (
              <div className="rounded-xl border border-border/70 bg-secondary/20 p-4 text-sm">
                Заполни анкету в{' '}
                <Link className="text-primary underline-offset-2 hover:underline" to={APP_PATHS.profile}>
                  профиле
                </Link>
                , затем вернись сюда.
              </div>
            ) : null}
            {hasProfileError ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                Не удалось загрузить профиль.
              </div>
            ) : null}
            {profile && questionnaireReady ? (
              <div className="space-y-4">
                <div className="grid gap-3 rounded-xl border border-border/70 bg-secondary/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <div className="text-xs text-secondary-foreground">Режим</div>
                    <div className="font-medium">
                      {activeTrainerUserId ? `С тренером · ${activeTrainerDisplay}` : 'Самостоятельно'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-secondary-foreground">Цель</div>
                    <div className="font-medium">{goalLabel}</div>
                  </div>
                  <div>
                    <div className="text-xs text-secondary-foreground">Уровень</div>
                    <div className="font-medium">{levelLabel}</div>
                  </div>
                  <div>
                    <div className="text-xs text-secondary-foreground">Локация</div>
                    <div className="font-medium">{locationLabel}</div>
                  </div>
                </div>

                {hasActivePlan && currentAdherence != null ? (
                  <div className="rounded-xl border border-border/70 bg-secondary/20 px-4 py-3 text-sm">
                    Прогресс цикла: {completedDaysCount}/{totalPlanDays} дней · adherence {currentAdherence}%
                    {showNextCycleCta
                      ? ' · можно запускать следующий цикл — частота подстроится под выполнение.'
                      : null}
                  </div>
                ) : null}
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    disabled={!canGenerateSystemPlan}
                    onClick={() => runGenerate('system')}
                  >
                    {generatePlanMutation.isPending
                      ? 'Генерируем...'
                      : showNextCycleCta && (!activeTrainerUserId || isSystemPlan)
                        ? 'Следующий цикл'
                        : hasActivePlan
                          ? 'Пересобрать системный план'
                          : 'Тренироваться самостоятельно'}
                  </Button>
                  {activeTrainerUserId ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!canGenerateTrainerPlan}
                      onClick={() => runGenerate('trainer')}
                    >
                      {generatePlanMutation.isPending
                        ? 'Генерируем...'
                        : showNextCycleCta && !isSystemPlan
                          ? 'Следующий цикл тренера'
                          : hasActivePlan
                            ? 'Пересобрать план тренера'
                            : 'План от тренера'}
                    </Button>
                  ) : (
                    <div className="text-sm text-secondary-foreground self-center">
                      Или выбери тренера в{' '}
                      <Link className="text-primary underline-offset-2 hover:underline" to={APP_PATHS.trainers}>
                        разделе «Тренеры»
                      </Link>
                      .
                    </div>
                  )}
                </div>
              </div>
            ) : null}
            {profile && !questionnaireReady && !hasNoProfile ? (
              <div className="rounded-xl border border-border/70 bg-secondary/20 p-4 text-sm">
                Дополни анкету в{' '}
                <Link className="text-primary underline-offset-2 hover:underline" to={APP_PATHS.profile}>
                  профиле
                </Link>
                , чтобы сгенерировать план.
              </div>
            ) : null}
          </CardContent>
        ) : null}
      </Card>

      {profile && questionnaireReady ? (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageX size={18} className="text-primary" />
              Чего у тебя нет
            </CardTitle>
            <CardDescription>
              {activeTrainerUserId
                ? 'Всё из каталога тренера считается доступным. Отметь то, чего нет — эти упражнения не попадут в план.'
                : 'Отметь недоступный инвентарь — системный план учтёт это при генерации.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeTrainerUserId && trainerCatalogQuery.isLoading ? (
              <Skeleton className="h-16 w-full rounded-xl" />
            ) : null}
            {!trainerCatalogQuery.isLoading && exclusionOptions.length === 0 ? (
              <div className="text-sm text-secondary-foreground">
                Пока нет вариантов инвентаря для исключения.
              </div>
            ) : null}
            {exclusionOptions.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {exclusionOptions.map((option) => {
                    const missing = option.selected
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={upsertMutation.isPending}
                        aria-pressed={missing}
                        title={missing ? 'Вернуть в доступные' : 'Отметить: этого нет'}
                        onClick={() => {
                          const key = option.value.toLocaleLowerCase('ru-RU')
                          const next = missing
                            ? unavailableEquipment.filter((item) => item.toLocaleLowerCase('ru-RU') !== key)
                            : [...unavailableEquipment, option.value]
                          saveUnavailable(next)
                        }}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition',
                          missing
                            ? 'border-destructive/35 bg-destructive/10 text-destructive'
                            : 'border-border/70 bg-background/80 text-secondary-foreground hover:border-destructive/25 hover:bg-destructive/[0.04] hover:text-foreground',
                        )}
                      >
                        {missing ? <Ban size={14} className="shrink-0 opacity-90" aria-hidden /> : null}
                        <span className={cn(missing && 'line-through decoration-destructive/50')}>{option.label}</span>
                        {missing ? (
                          <span className="rounded-md bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                            нет
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
                <div className="text-xs text-secondary-foreground">
                  {unavailableEquipment.length === 0
                    ? 'Пока ничего не исключено — в план пойдёт весь каталог.'
                    : `Не будет в плане: ${unavailableEquipment
                        .map((item) => formatEquipmentLabel(item, metaQuery.data?.equipment))
                        .join(', ')}`}
                </div>
                {hasActivePlan ? (
                  <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm">
                      Уже есть активный план — после изменений перегенерируй его, чтобы упражнения с этим
                      инвентарём появились или исчезли.
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="shrink-0"
                      onClick={() => {
                        setGenerationPanelOverride(true)
                        document.getElementById('plan-generation-panel')?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        })
                      }}
                    >
                      К обновлению плана
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun size={18} className="text-primary" />
            Сегодня
          </CardTitle>
          <CardDescription>Тренировка на сегодня: замена упражнений и отметка выполнения.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {todayWorkoutQuery.isLoading ? <Skeleton className="h-24 w-full rounded-xl" /> : null}
          {!todayWorkoutQuery.isLoading && hasNoTodayWorkout ? (
            <div className="rounded-xl border border-border/70 bg-secondary/20 p-4 text-sm text-secondary-foreground">
              {hasActivePlan
                ? 'Сегодня в плане день отдыха или тренировки нет.'
                : 'Сначала сгенерируй план — тогда здесь появится тренировка на сегодня.'}
            </div>
          ) : null}
          {!todayWorkoutQuery.isLoading && todayWorkoutQuery.isError && !hasNoTodayWorkout ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              Не удалось загрузить тренировку на сегодня.
            </div>
          ) : null}
          {todayWorkout ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/20 p-4">
                <div>
                  <div className="font-medium">{formatWeekday(todayWorkout.day_of_week)}</div>
                  <div className="text-xs text-secondary-foreground">
                    {formatDate(todayWorkout.scheduled_for)} · неделя {todayWorkout.week} ·{' '}
                    {todayWorkout.source === 'system' ? 'системный план' : 'план тренера'}
                  </div>
                </div>
                {todayWorkout.is_completed ? (
                  <div className="inline-flex items-center gap-1.5 text-sm text-primary">
                    <CheckCircle2 size={16} />
                    Выполнено
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={todayBusy}
                    onClick={() => completeDayMutation.mutate(todayWorkout.day_index)}
                  >
                    <CheckCircle2 size={14} />
                    {completeDayMutation.isPending ? 'Сохраняем...' : 'Отметить выполненной'}
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {todayWorkout.exercises.map((exercise) => {
                  const prescriptions = Array.isArray(exercise.set_prescriptions)
                    ? exercise.set_prescriptions
                    : []
                  const showSetList = hasSetProgression(prescriptions)
                  const detailsTo = todayWorkout.trainer_user_id
                    ? `/plan/exercises/${encodeURIComponent(exercise.exercise_id)}?trainer=${encodeURIComponent(todayWorkout.trainer_user_id)}`
                    : `/plan/exercises/${encodeURIComponent(exercise.exercise_id)}`
                  return (
                    <div
                      key={exercise.line_id}
                      className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/50 px-3 py-2 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <Link to={detailsTo} className="min-w-0 flex-1 transition hover:opacity-90">
                        <div className="text-sm font-medium">{exercise.exercise_name}</div>
                        {showSetList ? (
                          <ul className="mt-1 space-y-0.5 text-xs text-secondary-foreground">
                            {prescriptions.map((item) => (
                              <li key={`${exercise.line_id}-${item.set_index}`}>{formatSetLine(item)}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-xs text-secondary-foreground">{formatExerciseSummary(exercise)}</div>
                        )}
                        <div className="mt-1 text-xs text-primary">Подробнее</div>
                      </Link>
                      {!todayWorkout.is_completed ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="shrink-0"
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
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale size={18} className="text-primary" />
            Рабочие веса · система
          </CardTitle>
          <CardDescription>
            Веса для самостоятельной тренировки. Новый системный план подставит их вместо дефолта каталога.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {showPlatformWeightsCta ? (
            <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
              Заполни веса — системный план станет точнее. Осталось упражнений без веса:{' '}
              {missingPlatformWeightCount}.
            </div>
          ) : null}
          {platformCatalogQuery.isLoading || platformLoadsQuery.isLoading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : null}
          {!platformCatalogQuery.isLoading && platformWeightExercises.length === 0 ? (
            <div className="text-sm text-secondary-foreground">
              В платформенном каталоге пока нет силовых упражнений с базовым весом.
            </div>
          ) : null}
          <div className="space-y-2">
            {platformWeightExercises.map((exercise) => {
              const saved = platformLoadsByExercise.get(exercise.row_id)
              const draft = draftPlatformWeights[exercise.row_id]
              const value = draft ?? (saved != null ? String(saved) : '')
              return (
                <div
                  key={exercise.row_id}
                  className="flex flex-col gap-2 rounded-xl border border-border/70 bg-secondary/15 p-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{exercise.exercise_name}</div>
                    <div className="text-xs text-secondary-foreground">
                      Дефолт каталога: {exercise.default_weight_kg} кг
                      {saved != null ? ` · твой вес: ${saved} кг` : ' · вес ещё не указан'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0.5}
                      step={0.5}
                      className="w-28"
                      value={value}
                      placeholder="кг"
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
                      Сохранить
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {activeTrainerUserId ? (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale size={18} className="text-primary" />
              Рабочие веса · тренер
            </CardTitle>
            <CardDescription>
              Укажи вес, с которым уже работаешь. Новый план тренера подставит его вместо дефолта каталога.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {showWeightsCta ? (
              <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
                Заполни веса — план станет точнее. Осталось упражнений без веса: {missingWeightCount}.
              </div>
            ) : null}
            {trainerCatalogQuery.isLoading || loadsQuery.isLoading ? <Skeleton className="h-24 w-full rounded-xl" /> : null}
            {!trainerCatalogQuery.isLoading && weightExercises.length === 0 ? (
              <div className="text-sm text-secondary-foreground">
                У активного тренера пока нет силовых упражнений с базовым весом.
              </div>
            ) : null}
            <div className="space-y-2">
              {weightExercises.map((exercise) => {
                const saved = loadsByExercise.get(exercise.row_id)
                const draft = draftWeights[exercise.row_id]
                const value = draft ?? (saved != null ? String(saved) : '')
                return (
                  <div
                    key={exercise.row_id}
                    className="flex flex-col gap-2 rounded-xl border border-border/70 bg-secondary/15 p-3 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{exercise.exercise_name}</div>
                      <div className="text-xs text-secondary-foreground">
                        Дефолт тренера: {exercise.default_weight_kg} кг
                        {saved != null ? ` · твой вес: ${saved} кг` : ' · вес ещё не указан'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0.5}
                        step={0.5}
                        className="w-28"
                        value={value}
                        placeholder="кг"
                        onChange={(event) =>
                          setDraftWeights((current) => ({ ...current, [exercise.row_id]: event.target.value }))
                        }
                      />
                      <Button
                        type="button"
                        size="sm"
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
                        Сохранить
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell size={18} className="text-primary" />
            Активный план
          </CardTitle>
          <CardDescription>Расписание тренировок на ближайшие недели.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activePlanQuery.isLoading ? <Skeleton className="h-24 w-full rounded-xl" /> : null}
          {!activePlanQuery.isLoading && hasNoActivePlan ? (
            <div className="rounded-xl border border-border/70 bg-secondary/20 p-4 text-sm text-secondary-foreground">
              Активного плана пока нет. Сгенерируй системный план или план от тренера выше.
            </div>
          ) : null}
          {!activePlanQuery.isLoading && activePlan ? (
            <>
              <div className="grid gap-3 rounded-xl border border-border/70 bg-secondary/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="text-xs text-secondary-foreground">Источник</div>
                  <div className="font-medium">{planSourceLabel}</div>
                </div>
                <div>
                  <div className="text-xs text-secondary-foreground">Период</div>
                  <div className="font-medium">
                    {formatDate(activePlan.start_date)} - {formatDate(activePlan.end_date)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-secondary-foreground">Цель / уровень</div>
                  <div className="font-medium">
                    {activeGoalLabel} · {activeLevelLabel}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-secondary-foreground">Объем</div>
                  <div className="font-medium">
                    {sortedPlanDays.length} тренировок · {totalExercises} упражнений
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                {weekEntries.map(([week, days]) => (
                  <div key={week} className="rounded-xl border border-border/70 bg-secondary/20 p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <CalendarDays size={15} className="text-primary" />
                        Неделя {week}
                      </div>
                      <span className="text-xs text-secondary-foreground">
                        {days.length} {days.length === 1 ? 'тренировка' : 'тренировки'}
                      </span>
                    </div>
                    <div className="grid gap-3">
                      {days.map((day) => (
                        <div
                          key={day.day_id}
                          className={cn(
                            'rounded-xl border bg-background/40 p-4',
                            day.scheduled_for === todayIso
                              ? 'border-primary/50 bg-primary/5'
                              : 'border-border/70',
                          )}
                        >
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="font-medium">
                              {formatWeekday(day.day_of_week)}
                              {day.scheduled_for === todayIso ? (
                                <span className="ml-2 text-xs font-normal text-primary">сегодня</span>
                              ) : null}
                              {day.is_completed ? (
                                <span className="ml-2 text-xs font-normal text-secondary-foreground">выполнено</span>
                              ) : null}
                            </div>
                            <div className="text-xs text-secondary-foreground">Дата: {formatDate(day.scheduled_for)}</div>
                          </div>
                          <div className="space-y-2">
                            {day.exercises.map((exercise) => {
                              const prescriptions = Array.isArray(exercise.set_prescriptions)
                                ? exercise.set_prescriptions
                                : []
                              const showSetList = hasSetProgression(prescriptions)
                              const summary = (
                                <>
                                  <div className="text-sm font-medium">{exercise.exercise_name}</div>
                                  {showSetList ? (
                                    <ul className="mt-1 space-y-0.5 text-xs text-secondary-foreground">
                                      {prescriptions.map((item) => (
                                        <li key={`${exercise.line_id}-${item.set_index}`}>{formatSetLine(item)}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <div className="text-xs text-secondary-foreground">{formatExerciseSummary(exercise)}</div>
                                  )}
                                </>
                              )
                              const detailsTo = activePlan.trainer_user_id
                                ? `/plan/exercises/${encodeURIComponent(exercise.exercise_id)}?trainer=${encodeURIComponent(activePlan.trainer_user_id)}`
                                : `/plan/exercises/${encodeURIComponent(exercise.exercise_id)}`
                              return (
                                <Link
                                  key={exercise.line_id}
                                  to={detailsTo}
                                  className="block rounded-lg border border-border/60 bg-background/50 px-3 py-2 transition hover:border-primary/40 hover:bg-primary/5"
                                >
                                  {summary}
                                  <div className="mt-1 text-xs text-primary">Подробнее</div>
                                </Link>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
