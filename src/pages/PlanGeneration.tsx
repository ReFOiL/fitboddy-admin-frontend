import axios from 'axios'
import { useState } from 'react'
import { CalendarDays, ChevronDown, ChevronUp, Dumbbell, Rocket } from 'lucide-react'
import { Link } from 'react-router-dom'

import { APP_PATHS } from '../config'
import { useAuth } from '../hooks/use-auth'
import { useProfile } from '../hooks/use-profile'
import { useClientRelations } from '../hooks/use-relations'
import { usePlans } from '../hooks/use-plans'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import { isProfileCompleted } from '../lib/profile-completion'

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

function formatExerciseDetails(
  sets: number | null,
  reps: number | null,
  durationSeconds: number | null,
  restSeconds: number | null,
): string {
  if (durationSeconds && durationSeconds > 0) {
    return `Длительность: ${durationSeconds} сек${restSeconds ? ` · Отдых: ${restSeconds} сек` : ''}`
  }

  if (sets && reps) {
    return `Подходы: ${sets} · Повторения: ${reps}${restSeconds ? ` · Отдых: ${restSeconds} сек` : ''}`
  }

  if (sets) {
    return `Подходы: ${sets}${restSeconds ? ` · Отдых: ${restSeconds} сек` : ''}`
  }

  if (reps) {
    return `Повторения: ${reps}${restSeconds ? ` · Отдых: ${restSeconds} сек` : ''}`
  }

  return restSeconds ? `Отдых: ${restSeconds} сек` : 'Параметры уточняются тренером'
}

export function PlanGenerationPage() {
  const { user } = useAuth()
  const isClient = user?.role === 'client'
  const clientUserId = isClient && user?.user_id ? user.user_id : ''

  const { clientActiveRelationQuery } = useClientRelations({ clientUserId })
  const { activePlanQuery, generatePlanMutation } = usePlans(clientUserId)
  const { profileQuery, metaQuery } = useProfile(clientUserId)

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

  const goalLabel =
    metaQuery.data?.goals.find((item) => item.value === profile?.goal)?.label ?? textOrFallback(profile?.goal)
  const levelLabel =
    metaQuery.data?.levels.find((item) => item.value === profile?.experience_level)?.label ?? textOrFallback(profile?.experience_level)
  const locationLabel =
    metaQuery.data?.workout_locations.find((item) => item.value === profile?.workout_location)?.label ??
    textOrFallback(profile?.workout_location)
  const equipmentLabels =
    profile?.equipment.map((value) => metaQuery.data?.equipment.find((item) => item.value === value)?.label ?? value) ?? []

  const canGeneratePlan = Boolean(
    isClient &&
      user?.user_id &&
      activeTrainerUserId &&
      questionnaireReady &&
      profile &&
      !generatePlanMutation.isPending,
  )
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
      <Card className="border-primary/20">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <Rocket size={18} className="text-primary" />
              Обновить план из анкеты
            </CardTitle>
            <CardDescription>
              Параметры подтягиваются из профиля автоматически.
            </CardDescription>
          </div>
          {hasActivePlan ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setGenerationPanelOverride((current) => !(current ?? false))}
            >
              {isGenerationPanelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {isGenerationPanelOpen ? 'Свернуть блок' : 'Раскрыть блок'}
            </Button>
          ) : null}
        </CardHeader>
        {isGenerationPanelOpen ? (
          <CardContent className="grid gap-4">
            <div className="grid gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs text-secondary-foreground">Активный тренер</div>
                <div className="font-medium">{activeTrainerDisplay || 'Нет активной связи'}</div>
              </div>
              <div>
                <div className="mb-1 text-xs text-secondary-foreground">Статус плана</div>
                <div className="font-medium">{hasActivePlan ? 'Есть активный план (будет обновлен)' : 'План будет создан впервые'}</div>
              </div>
            </div>

            <div className="grid gap-3 rounded-xl border border-border/70 bg-secondary/20 p-4 text-sm sm:grid-cols-2">
              <div>
                <div className="text-xs text-secondary-foreground">Цель из анкеты</div>
                <div>{goalLabel}</div>
              </div>
              <div>
                <div className="text-xs text-secondary-foreground">Уровень из анкеты</div>
                <div>{levelLabel}</div>
              </div>
              <div>
                <div className="text-xs text-secondary-foreground">Место тренировок</div>
                <div>{locationLabel}</div>
              </div>
              <div>
                <div className="text-xs text-secondary-foreground">Оборудование</div>
                <div>{equipmentLabels.length > 0 ? equipmentLabels.join(', ') : 'Не указано'}</div>
              </div>
            </div>

            <Button
              type="button"
              disabled={!canGeneratePlan}
              onClick={() => {
                if (!user?.user_id || !profile?.goal || !profile.experience_level || !profile.workout_location || !activeTrainerUserId) return
                generatePlanMutation.mutate({
                  trainer_user_id: activeTrainerUserId,
                  user_id: user.user_id,
                  goal: profile.goal,
                  level: profile.experience_level,
                  workout_location: profile.workout_location,
                  equipment: profile.workout_location === 'home' ? profile.equipment : [],
                })
              }}
            >
              <Rocket size={14} />
              {hasActivePlan ? 'Обновить план' : 'Сгенерировать план'}
            </Button>

            {clientActiveRelationQuery.isLoading ? <Skeleton className="h-10 w-full rounded-xl" /> : null}
            {hasNoActiveRelation ? (
              <span className="text-sm text-secondary-foreground">
                Сначала подключись к тренеру в разделе{' '}
                <Link to={APP_PATHS.trainers} className="underline decoration-dotted underline-offset-4">
                  «Тренеры»
                </Link>
                .
              </span>
            ) : null}
            {profileQuery.isLoading ? <Skeleton className="h-10 w-full rounded-xl" /> : null}
            {hasNoProfile ? (
              <span className="text-sm text-secondary-foreground">
                Сначала заполни профиль в разделе{' '}
                <Link to={APP_PATHS.profile} className="underline decoration-dotted underline-offset-4">
                  «Профиль и цели»
                </Link>
                .
              </span>
            ) : null}
            {!profileQuery.isLoading && !hasNoProfile && !questionnaireReady ? (
              <span className="text-sm text-secondary-foreground">
                В анкете не хватает данных (цель, уровень или место тренировок). Дополни профиль перед обновлением плана.
              </span>
            ) : null}
            {hasProfileError ? <span className="text-sm text-destructive">Не удалось проверить профиль пользователя.</span> : null}
            {hasRelationError ? <span className="text-sm text-destructive">Не удалось загрузить активную связь с тренером.</span> : null}
          </CardContent>
        ) : (
          <CardContent>
            <div className="rounded-xl border border-border/70 bg-secondary/20 px-4 py-3 text-sm text-secondary-foreground">
              Блок скрыт. Раскрой его, если нужно обновить текущий план из анкеты.
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell size={18} className="text-primary" />
            Мой активный план
          </CardTitle>
          <CardDescription>Просмотр структуры плана по неделям и дням. Этот блок всегда остается доступным на странице.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {activePlanQuery.isLoading ? <Skeleton className="h-24 w-full rounded-xl" /> : null}
          {!activePlanQuery.isLoading && hasNoActivePlan ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-secondary/20 p-4 text-sm text-secondary-foreground">
              Активного плана пока нет. Используй блок выше, чтобы сформировать первый план из анкеты.
            </div>
          ) : null}
          {!activePlanQuery.isLoading && activePlan ? (
            <>
              <div className="grid gap-3 rounded-xl border border-border/70 bg-secondary/20 p-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <div className="text-xs text-secondary-foreground">Цель</div>
                  <div className="font-medium">{activeGoalLabel}</div>
                </div>
                <div>
                  <div className="text-xs text-secondary-foreground">Уровень</div>
                  <div className="font-medium">{activeLevelLabel}</div>
                </div>
                <div>
                  <div className="text-xs text-secondary-foreground">Тренер</div>
                  <div className="font-medium">{activeTrainerDisplay || activePlan.trainer_user_id}</div>
                </div>
                <div>
                  <div className="text-xs text-secondary-foreground">Период</div>
                  <div className="font-medium">
                    {formatDate(activePlan.start_date)} - {formatDate(activePlan.end_date)}
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
                        <div key={day.day_id} className="rounded-xl border border-border/70 bg-background/40 p-4">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="font-medium">{formatWeekday(day.day_of_week)}</div>
                            <div className="text-xs text-secondary-foreground">Дата: {formatDate(day.scheduled_for)}</div>
                          </div>
                          <div className="space-y-2">
                            {day.exercises.map((exercise) => (
                              <Link
                                key={exercise.line_id}
                                to={`/plan/exercises/${encodeURIComponent(exercise.exercise_id)}?trainer=${encodeURIComponent(activePlan.trainer_user_id)}`}
                                className="block rounded-lg border border-border/60 bg-background/50 px-3 py-2 transition hover:border-primary/40 hover:bg-primary/5"
                              >
                                <div className="text-sm font-medium">{exercise.exercise_name}</div>
                                <div className="text-xs text-secondary-foreground">
                                  {formatExerciseDetails(exercise.sets, exercise.reps, exercise.duration_seconds, exercise.rest_seconds)}
                                </div>
                                <div className="mt-1 text-xs text-primary">Подробнее</div>
                              </Link>
                            ))}
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
