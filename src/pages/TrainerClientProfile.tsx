import axios from 'axios'
import { ArrowLeft, CalendarDays, CheckCircle2, Rocket, Scale, Target, UserCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { useAuth } from '../hooks/use-auth'
import { useProfile } from '../hooks/use-profile'
import { useTrainerRelations } from '../hooks'
import { useClientLoads, usePlans } from '../hooks/use-plans'
import { listTrainerExercises } from '../api/exercises'
import { queryKeys } from '../api/queryKeys'
import { APP_PATHS } from '../config'
import { PlanCollapsible } from '../components/plan/PlanCollapsible'
import { formatEquipmentLabel } from '../lib/equipment'
import { isProfileCompleted } from '../lib/profile-completion'
import { cn } from '../lib/utils'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Skeleton } from '../components/ui/skeleton'
import { StyledSelect } from '../components/ui/styled-select'
import type { PlanDay } from '../types/plan'

function textOrPlaceholder(value: string | null | undefined): string {
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
  return `Д${dayOfWeek}`
}

export function TrainerClientProfilePage() {
  const { user } = useAuth()
  const isTrainer = user?.role === 'trainer'
  const trainerUserId = isTrainer && user?.user_id ? user.user_id : ''
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedClientUserId = (searchParams.get('clientUserId') ?? '').trim()

  const { trainerClientsQuery } = useTrainerRelations({ trainerUserId })
  const trainerClients = useMemo(
    () => (Array.isArray(trainerClientsQuery.data) ? trainerClientsQuery.data : []),
    [trainerClientsQuery.data],
  )

  const formatClientLabel = (relation: (typeof trainerClients)[number]): string => {
    const displayName = relation.client_display_name?.trim()
    if (displayName) return displayName
    const login = relation.client_login?.trim()
    if (login) return `@${login}`
    return 'Клиент'
  }

  const resolvedTargetUserId = useMemo(() => {
    if (requestedClientUserId && trainerClients.some((relation) => relation.client_user_id === requestedClientUserId)) {
      return requestedClientUserId
    }
    return trainerClients[0]?.client_user_id ?? ''
  }, [requestedClientUserId, trainerClients])

  const selectOptions = trainerClients.map((relation) => ({
    value: relation.client_user_id,
    label: formatClientLabel(relation),
  }))
  const selectValue = resolvedTargetUserId || undefined
  const selectedRelation = trainerClients.find((relation) => relation.client_user_id === (selectValue ?? ''))

  const profileTargetUserId = selectValue ?? ''
  const { profileQuery, metaQuery } = useProfile(profileTargetUserId)
  const loadErrorStatus = axios.isAxiosError(profileQuery.error) ? profileQuery.error.response?.status : undefined
  const isNotFound = loadErrorStatus === 404
  const isForbidden = loadErrorStatus === 403
  const hasProfileLoadError = Boolean(profileQuery.error) && !isNotFound && !isForbidden
  const profile = profileQuery.data
  const questionnaireReady = isProfileCompleted(profile)

  const { activePlanQuery, generatePlanMutation } = usePlans(profileTargetUserId)
  const activePlanErrorStatus = axios.isAxiosError(activePlanQuery.error)
    ? activePlanQuery.error.response?.status
    : undefined
  const hasNoActivePlan = activePlanErrorStatus === 404
  const activePlan = activePlanQuery.data
  const hasActivePlan = Boolean(!activePlanQuery.isLoading && !hasNoActivePlan && activePlan)

  const { loadsQuery, upsertLoadMutation } = useClientLoads(profileTargetUserId, trainerUserId)
  const catalogQuery = useQuery({
    queryKey: queryKeys.exercises.trainerCatalog(trainerUserId, false),
    queryFn: async () => listTrainerExercises(trainerUserId, false),
    enabled: Boolean(trainerUserId),
  })
  const weightExercises = useMemo(
    () =>
      (Array.isArray(catalogQuery.data) ? catalogQuery.data : []).filter(
        (exercise) => exercise.is_active && exercise.default_weight_kg != null && exercise.default_weight_kg > 0,
      ),
    [catalogQuery.data],
  )
  const loads = useMemo(
    () => (Array.isArray(loadsQuery.data) ? loadsQuery.data : []),
    [loadsQuery.data],
  )
  const loadsByExercise = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of loads) {
      map.set(item.exercise_row_id, item.working_weight_kg)
    }
    return map
  }, [loads])
  const filledWeightCount = weightExercises.filter((exercise) => loadsByExercise.has(exercise.row_id)).length
  const weightsReady = weightExercises.length === 0 || filledWeightCount === weightExercises.length
  const [draftWeights, setDraftWeights] = useState<Record<string, string>>({})
  const weightRows = useMemo(
    () =>
      [...weightExercises]
        .sort((left, right) => left.exercise_name.localeCompare(right.exercise_name, 'ru'))
        .map((exercise) => ({
          rowId: exercise.row_id,
          name: exercise.exercise_name,
          clientWeight: loadsByExercise.get(exercise.row_id) ?? null,
          trainerDefault: exercise.default_weight_kg,
        })),
    [weightExercises, loadsByExercise],
  )

  const sortedPlanDays = useMemo(() => {
    if (!activePlan) return [] as PlanDay[]
    return [...activePlan.days].sort((left, right) => {
      if (left.week !== right.week) return left.week - right.week
      return left.day_index - right.day_index
    })
  }, [activePlan])

  const daysByWeek = sortedPlanDays.reduce<Record<number, PlanDay[]>>((grouped, day) => {
    if (!grouped[day.week]) grouped[day.week] = []
    grouped[day.week].push(day)
    return grouped
  }, {})
  const weekEntries = Object.entries(daysByWeek).sort(([left], [right]) => Number(left) - Number(right))
  const completedDaysCount = activePlan ? activePlan.days.filter((day) => day.is_completed).length : 0
  const totalPlanDays = activePlan?.days.length ?? 0
  const currentAdherence = totalPlanDays > 0 ? Math.round((completedDaysCount / totalPlanDays) * 100) : null

  const ageLabel = profile?.age != null ? String(profile.age) : textOrPlaceholder(null)
  const genderLabel =
    metaQuery.data?.genders.find((item) => item.value === profile?.gender)?.label ?? textOrPlaceholder(profile?.gender)
  const goalLabel = metaQuery.data?.goals.find((item) => item.value === profile?.goal)?.label ?? textOrPlaceholder(profile?.goal)
  const levelLabel =
    metaQuery.data?.levels.find((item) => item.value === profile?.experience_level)?.label ??
    textOrPlaceholder(profile?.experience_level)
  const locationLabel =
    metaQuery.data?.workout_locations.find((item) => item.value === profile?.workout_location)?.label ??
    textOrPlaceholder(profile?.workout_location)
  const unavailableLabels = Array.isArray(profile?.unavailable_equipment)
    ? profile.unavailable_equipment.map((value) => formatEquipmentLabel(value, metaQuery.data?.equipment))
    : []

  const canGenerate = Boolean(
    profileTargetUserId &&
      trainerUserId &&
      questionnaireReady &&
      profile &&
      !generatePlanMutation.isPending,
  )

  const selectClient = (clientUserId: string) => {
    setDraftWeights({})
    setSearchParams({ clientUserId }, { replace: true })
  }

  const runGenerate = () => {
    if (!profile || !profileTargetUserId || !trainerUserId) return
    generatePlanMutation.mutate({
      source: 'trainer',
      trainer_user_id: trainerUserId,
      user_id: profileTargetUserId,
      goal: profile.goal ?? 'maintenance',
      level: profile.experience_level ?? 'intermediate',
      workout_location: profile.workout_location ?? 'both',
      unavailable_equipment: profile.unavailable_equipment ?? [],
    })
  }

  if (!isTrainer) {
    return <Navigate to="/home" replace />
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/20">
        <CardHeader className="border-b border-border/60 bg-gradient-to-b from-primary/10 to-transparent">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target size={18} className="text-primary" />
                Клиент
              </CardTitle>
              <CardDescription className="mt-1">
                Анкета (просмотр), план тренера и рабочие веса.
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="secondary" className="w-full sm:w-auto">
              <Link to={APP_PATHS.clients}>
                <ArrowLeft size={14} />
                К списку клиентов
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 sm:gap-4 sm:p-5">
          <div className="grid gap-1.5 rounded-xl border border-border/70 bg-secondary/20 p-3">
            <Label htmlFor="client_select">Клиент</Label>
            <StyledSelect
              id="client_select"
              placeholder="Выбери клиента"
              value={selectValue}
              options={selectOptions}
              disabled={trainerClientsQuery.isLoading || selectOptions.length === 0}
              onChange={selectClient}
            />
          </div>
        </CardContent>
      </Card>

      {!profileTargetUserId && !trainerClientsQuery.isLoading ? (
        <Card className="border-primary/20">
          <CardContent className="py-6 text-sm text-secondary-foreground">
            {trainerClients.length === 0 ? 'У вас пока нет активных клиентов.' : 'Выбери клиента из списка.'}
          </CardContent>
        </Card>
      ) : null}

      {profileTargetUserId ? (
        <>
          <Card className="overflow-hidden border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck size={18} className="text-primary" />
                {selectedRelation ? formatClientLabel(selectedRelation) : 'Профиль клиента'}
              </CardTitle>
              <CardDescription>Анкета клиента — только просмотр.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {profileQuery.isFetching ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                </div>
              ) : null}

              {isNotFound ? (
                <span className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2 text-sm text-secondary-foreground">
                  Профиль клиента пока не заполнен.
                </span>
              ) : null}
              {isForbidden ? (
                <span className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Доступ запрещен: проверьте активную связь с клиентом.
                </span>
              ) : null}
              {hasProfileLoadError ? (
                <span className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Не удалось загрузить профиль клиента.
                </span>
              ) : null}

              {profile && !profileQuery.isFetching ? (
                <div className="grid gap-3 sm:gap-4 lg:grid-cols-5">
                  <div className="rounded-xl border border-border/70 bg-secondary/15 p-4 lg:col-span-2">
                    <div className="flex items-start gap-4">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="Аватар клиента"
                          className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/40"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border/70 bg-background text-xs text-secondary-foreground">
                          Нет фото
                        </div>
                      )}
                      <div className="min-w-0 space-y-1">
                        <div className="truncate text-base font-semibold">{textOrPlaceholder(profile.full_name)}</div>
                        <div className="text-sm text-secondary-foreground">Город: {textOrPlaceholder(profile.city)}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-secondary-foreground">{textOrPlaceholder(profile.bio)}</div>
                  </div>

                  <div className="grid gap-3 rounded-xl border border-border/70 bg-secondary/15 p-4 lg:col-span-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-1">
                        <span className="text-xs text-secondary-foreground">Возраст</span>
                        <span className="text-sm">{ageLabel}</span>
                      </div>
                      <div className="grid gap-1">
                        <span className="text-xs text-secondary-foreground">Пол</span>
                        <span className="text-sm">{genderLabel}</span>
                      </div>
                      <div className="grid gap-1">
                        <span className="text-xs text-secondary-foreground">Цель</span>
                        <span className="text-sm">{goalLabel}</span>
                      </div>
                      <div className="grid gap-1">
                        <span className="text-xs text-secondary-foreground">Уровень</span>
                        <span className="text-sm">{levelLabel}</span>
                      </div>
                      <div className="grid gap-1">
                        <span className="text-xs text-secondary-foreground">Место тренировок</span>
                        <span className="text-sm">{locationLabel}</span>
                      </div>
                      <div className="grid gap-1">
                        <span className="text-xs text-secondary-foreground">
                          Нет в наличии
                          {unavailableLabels.length > 0 ? ` (${unavailableLabels.length})` : ''}
                        </span>
                        {unavailableLabels.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {unavailableLabels.map((item, index) => (
                              <span
                                key={`${item}-${index}`}
                                className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-xs"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-secondary-foreground">Исключений нет</span>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-1">
                        <span className="text-xs text-secondary-foreground">Ограничения</span>
                        <span className="text-sm">{textOrPlaceholder(profile.limitations)}</span>
                      </div>
                      <div className="grid gap-1">
                        <span className="text-xs text-secondary-foreground">Медицинские заметки</span>
                        <span className="text-sm">{textOrPlaceholder(profile.medical_notes)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket size={18} className="text-primary" />
                План тренера
              </CardTitle>
              <CardDescription>
                Генерация и просмотр активного плана клиента из вашего каталога.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!questionnaireReady && profile ? (
                <p className="rounded-xl border border-border/70 bg-secondary/20 px-3 py-2 text-sm text-secondary-foreground">
                  Анкета клиента неполная — генерация недоступна, пока клиент не заполнит цель, уровень, место и возраст.
                </p>
              ) : null}

              {activePlanQuery.isLoading ? <Skeleton className="h-24 w-full rounded-xl" /> : null}

              {!activePlanQuery.isLoading && hasNoActivePlan ? (
                <div className="space-y-3 rounded-xl border border-border/70 bg-secondary/15 p-4">
                  <p className="text-sm text-secondary-foreground">Активного плана пока нет.</p>
                  <Button type="button" className="w-full sm:w-auto" disabled={!canGenerate} onClick={runGenerate}>
                    {generatePlanMutation.isPending ? 'Генерируем…' : 'Сгенерировать план'}
                  </Button>
                </div>
              ) : null}

              {hasActivePlan && activePlan ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border/70 bg-secondary/15 p-4 text-sm">
                    <div className="font-medium">
                      {activePlan.start_date} — {activePlan.end_date}
                    </div>
                    <div className="mt-1 text-secondary-foreground">
                      {goalLabel} · {levelLabel} · {activePlan.workouts_per_week} тр./нед.
                      {currentAdherence != null
                        ? ` · прогресс ${completedDaysCount}/${totalPlanDays} (${currentAdherence}%)`
                        : null}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full sm:w-auto"
                    disabled={!canGenerate}
                    onClick={runGenerate}
                  >
                    {generatePlanMutation.isPending ? 'Генерируем…' : 'Пересобрать план'}
                  </Button>

                  <PlanCollapsible
                    title="Расписание"
                    subtitle={`${sortedPlanDays.length} тренировок`}
                    icon={<CalendarDays size={16} />}
                    defaultOpen={false}
                  >
                    <div className="space-y-3">
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
                                day.is_completed ? 'border-primary/30 bg-primary/5' : 'border-border/60',
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
                              <ul className="mt-2 space-y-1">
                                {day.exercises.map((exercise) => (
                                  <li
                                    key={exercise.line_id}
                                    className="truncate text-xs text-secondary-foreground"
                                  >
                                    {exercise.exercise_name}
                                    {exercise.weight_kg != null ? ` · ${exercise.weight_kg} кг` : ''}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </PlanCollapsible>
                </div>
              ) : null}

              {activePlanQuery.isError && !hasNoActivePlan ? (
                <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Не удалось загрузить план клиента.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale size={18} className="text-primary" />
                Рабочие веса
              </CardTitle>
              <CardDescription>
                {catalogQuery.isLoading || loadsQuery.isLoading
                  ? 'Загрузка…'
                  : weightExercises.length === 0
                    ? 'В каталоге нет силовых упражнений с весом.'
                    : weightsReady
                      ? `Заполнены (${filledWeightCount}/${weightExercises.length})`
                      : `Заполнено ${filledWeightCount}/${weightExercises.length} — можно дополнить`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadsQuery.isError ? (
                <p className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2 text-sm text-secondary-foreground">
                  Не удалось загрузить рабочие веса клиента.
                </p>
              ) : null}
              {catalogQuery.isLoading || loadsQuery.isLoading ? (
                <Skeleton className="h-24 w-full rounded-xl" />
              ) : null}
              {weightRows.map((row) => {
                const saved = row.clientWeight
                const draft = draftWeights[row.rowId]
                const value = draft ?? (saved != null ? String(saved) : '')
                return (
                  <div key={row.rowId} className="rounded-xl border border-border/60 bg-background/40 p-3">
                    <div className="text-sm font-medium">{row.name}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        type="number"
                        min={0.5}
                        step={0.5}
                        className="h-11 flex-1"
                        value={value}
                        placeholder={`${row.trainerDefault ?? ''}`}
                        onChange={(event) =>
                          setDraftWeights((current) => ({
                            ...current,
                            [row.rowId]: event.target.value,
                          }))
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
                            exerciseRowId: row.rowId,
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
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
