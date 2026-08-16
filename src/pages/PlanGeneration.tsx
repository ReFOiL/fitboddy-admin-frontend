import { useMemo, useState } from 'react'
import {
  Ban,
  PackageX,
  Rocket,
  Scale,
  Settings2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { APP_PATHS } from '../config'
import { useAuth } from '../hooks/use-auth'
import { useClientPlanModel } from '../hooks/use-client-plan-model'
import { useClientLoads, useClientPlatformLoads } from '../hooks/use-plans'
import { useWorkoutSession } from '../hooks/use-workout-session'
import { listPlatformExercises, listTrainerExercises } from '../api/exercises'
import { queryKeys } from '../api/queryKeys'
import { PlanCollapsible } from '../components/plan/PlanCollapsible'
import { PlanSchedule } from '../components/plan/PlanSchedule'
import { TodayWorkoutCard } from '../components/plan/TodayWorkoutCard'
import { WeekStrip } from '../components/plan/WeekStrip'
import { WorkoutSession } from '../components/plan/WorkoutSession'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import { AlertBanner, EmptyState, QueryState } from '../components/shared'
import { collectCatalogEquipmentTags, formatEquipmentLabel } from '../lib/equipment'
import {
  textOrFallback,
} from '../lib/plan-formatters'
import { selectPlanDay } from '../lib/plan-day-selector'
import { cn } from '../lib/utils'

export function PlanGenerationPage() {
  const { user } = useAuth()
  const isClient = user?.role === 'client'
  const {
    clientUserId,
    clientActiveRelationQuery,
    activePlanQuery,
    todayWorkoutQuery,
    generatePlanMutation,
    completeDayMutation,
    replaceExerciseMutation,
    profileQuery,
    metaQuery,
    upsertMutation,
    profile,
    questionnaireReady,
    activeTrainerUserId,
    activeTrainerDisplay,
    hasNoProfile,
    hasProfileError,
    hasRelationError,
    hasActiveTrainer,
    hasNoActivePlan,
    hasActivePlan,
    activePlan,
    todayWorkout,
    hasNoTodayWorkout,
    canGenerateSystemPlan,
    canGenerateTrainerPlan,
    todayIso,
    completedDaysCount,
    totalPlanDays,
    currentAdherence,
    showNextCycleCta,
    runGenerate,
  } = useClientPlanModel(user)
  const [draftWeights, setDraftWeights] = useState<Record<string, string>>({})
  const [draftPlatformWeights, setDraftPlatformWeights] = useState<Record<string, string>>({})
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)

  const trainerCatalogQuery = useQuery({
    queryKey: queryKeys.exercises.trainerCatalog(activeTrainerUserId, false),
    queryFn: async () => listTrainerExercises(activeTrainerUserId, false),
    enabled: Boolean(activeTrainerUserId),
  })
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

  const isSystemPlan = activePlan?.source === 'system'
  const isPreviousTrainerPlan = Boolean(
    activePlan?.source === 'trainer' &&
      activePlan.trainer_user_id &&
      activePlan.trainer_user_id !== activeTrainerUserId,
  )
  const planSourceLabel = isSystemPlan
    ? 'Самостоятельно'
    : isPreviousTrainerPlan
      ? 'Предыдущий тренер'
      : activeTrainerDisplay || 'Тренер'
  const todayBusy = completeDayMutation.isPending || replaceExerciseMutation.isPending

  const daySelection = useMemo(
    () =>
      selectPlanDay({
        plan: activePlan,
        todayIso,
        selectedDayId,
        todayWorkout,
      }),
    [activePlan, selectedDayId, todayIso, todayWorkout],
  )
  const sortedPlanDays = daySelection.sortedDays
  const activeGoalLabel =
    metaQuery.data?.goals.find((item) => item.value === activePlan?.goal)?.label ?? textOrFallback(activePlan?.goal)
  const activeLevelLabel =
    metaQuery.data?.levels.find((item) => item.value === activePlan?.level)?.label ?? textOrFallback(activePlan?.level)

  const workoutSession = useWorkoutSession(todayWorkout)

  const finishWorkout = () => {
    if (!todayWorkout || todayWorkout.is_completed) return
    completeDayMutation.mutate(todayWorkout.day_index, {
      onSuccess: workoutSession.finish,
    })
  }

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

  if (workoutSession.isActive && todayWorkout) {
    return (
      <WorkoutSession
        workout={todayWorkout}
        checkedLineIds={workoutSession.checkedLineIds}
        checkedCount={workoutSession.checkedCount}
        exerciseTotal={workoutSession.exerciseTotal}
        busy={todayBusy}
        completing={completeDayMutation.isPending}
        onCollapse={workoutSession.collapse}
        onToggleChecked={workoutSession.toggleChecked}
        onReplaceExercise={(lineId) =>
          replaceExerciseMutation.mutate({
            dayIndex: todayWorkout.day_index,
            lineId,
          })
        }
        onFinish={finishWorkout}
      />
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
              <Link to={APP_PATHS.profileOnboarding}>Заполнить профиль</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {hasProfileError ? (
        <QueryState
          isError
          errorTitle="Не удалось загрузить профиль"
          onRetry={() => void profileQuery.refetch()}
        >
          {null}
        </QueryState>
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
              <AlertBanner tone="warning" title="Не удалось проверить связь с тренером">
                Самостоятельный режим доступен.
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => void clientActiveRelationQuery.refetch()}
                >
                  Повторить
                </Button>
              </AlertBanner>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {hasActivePlan ? (
        <>
          {isPreviousTrainerPlan ? (
            <AlertBanner title="План составлен предыдущим тренером">
              План остаётся доступным вам без изменений. Текущий тренер сможет заменить его только после явного
              создания нового плана.
            </AlertBanner>
          ) : null}

          <WeekStrip
            days={daySelection.weekDays}
            focusedDayId={daySelection.focusedDayId}
            todayIso={todayIso}
            onSelectDay={setSelectedDayId}
          />

          <TodayWorkoutCard
            selection={daySelection}
            todayIso={todayIso}
            todayWorkout={todayWorkout}
            todayLoading={todayWorkoutQuery.isLoading}
            todayMissing={hasNoTodayWorkout}
            todayError={todayWorkoutQuery.isError}
            planSourceLabel={planSourceLabel}
            onStartWorkout={workoutSession.start}
            onRetry={() => void todayWorkoutQuery.refetch()}
          />

          {showNextCycleCta ? (
            <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
              Цикл завершён{currentAdherence != null ? ` · выполнено ${currentAdherence}%` : ''}. Можно запустить
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
                        : isPreviousTrainerPlan
                          ? 'Заменить план новым тренером'
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
                <EmptyState className="py-7" title="Нет инвентаря для исключения" />
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
                {platformCatalogQuery.isError || platformLoadsQuery.isError ? (
                  <QueryState
                    isError
                    errorTitle="Не удалось загрузить рабочие веса"
                    onRetry={() => {
                      void platformCatalogQuery.refetch()
                      void platformLoadsQuery.refetch()
                    }}
                  >
                    {null}
                  </QueryState>
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
                            aria-label={`Рабочий вес: ${exercise.exercise_name}`}
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
                            Сохранить
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
                {trainerCatalogQuery.isError || loadsQuery.isError ? (
                  <QueryState
                    isError
                    errorTitle="Не удалось загрузить рабочие веса"
                    onRetry={() => {
                      void trainerCatalogQuery.refetch()
                      void loadsQuery.refetch()
                    }}
                  >
                    {null}
                  </QueryState>
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
                            aria-label={`Рабочий вес: ${exercise.exercise_name}`}
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
                            Сохранить
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </PlanCollapsible>
            ) : null}

            <PlanSchedule
              days={sortedPlanDays}
              todayIso={todayIso}
              trainerUserId={activePlan?.trainer_user_id}
            />
          </PlanCollapsible>
        </>
      ) : null}
    </div>
  )
}
