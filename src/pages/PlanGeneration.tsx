import axios from 'axios'
import { Rocket } from 'lucide-react'
import { Link } from 'react-router-dom'

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

  if (!isClient) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket size={18} className="text-primary" />
            Генерация плана
          </CardTitle>
          <CardDescription>Этот раздел доступен только клиентам.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket size={18} className="text-primary" />
            Генерация плана из анкеты
          </CardTitle>
          <CardDescription>
            Параметры для плана подтягиваются автоматически из профиля клиента. Ручной ввод отключен.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-xl border border-border/70 bg-secondary/20 p-4 text-sm">
            <div className="mb-2 text-xs text-secondary-foreground">Активный тренер</div>
            <div>{activeTrainerDisplay || 'Нет активной связи'}</div>
          </div>

          <div className="grid gap-3 rounded-xl border border-border/70 bg-secondary/20 p-4 text-sm sm:grid-cols-2">
            <div>
              <div className="text-xs text-secondary-foreground">Цель</div>
              <div>{goalLabel}</div>
            </div>
            <div>
              <div className="text-xs text-secondary-foreground">Уровень</div>
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
            Сгенерировать план
          </Button>

          {clientActiveRelationQuery.isLoading ? <Skeleton className="h-10 w-full rounded-xl" /> : null}
          {hasNoActiveRelation ? (
            <span className="text-sm text-secondary-foreground">
              Сначала подключись к тренеру в разделе{' '}
              <Link to="/trainers" className="underline decoration-dotted underline-offset-4">
                «Тренеры»
              </Link>
              .
            </span>
          ) : null}
          {profileQuery.isLoading ? <Skeleton className="h-10 w-full rounded-xl" /> : null}
          {hasNoProfile ? (
            <span className="text-sm text-secondary-foreground">
              Сначала заполни профиль в разделе{' '}
              <Link to="/profile" className="underline decoration-dotted underline-offset-4">
                «Профиль и цели»
              </Link>
              .
            </span>
          ) : null}
          {!profileQuery.isLoading && !hasNoProfile && !questionnaireReady ? (
            <span className="text-sm text-secondary-foreground">
              В анкете не хватает данных (цель, уровень или место тренировок). Дополни профиль перед генерацией.
            </span>
          ) : null}
          {hasProfileError ? <span className="text-sm text-destructive">Не удалось проверить профиль пользователя.</span> : null}
          {hasRelationError ? <span className="text-sm text-destructive">Не удалось загрузить активную связь с тренером.</span> : null}

          <div className="rounded-xl border border-border/70 bg-secondary/20 px-4 py-3 text-sm">
            {activePlanQuery.isLoading ? <Skeleton className="h-6 w-64 rounded-md" /> : null}
            {!activePlanQuery.isLoading && hasNoActivePlan ? <span className="text-secondary-foreground">Активный план пока не найден.</span> : null}
            {!activePlanQuery.isLoading && !hasNoActivePlan && activePlanQuery.data ? (
              <div className="space-y-1">
                <div className="font-medium">
                  Активный план: {activePlanQuery.data.goal} ({activePlanQuery.data.level})
                </div>
                <div className="text-secondary-foreground">
                  Тренер: {activeTrainerDisplay || activePlanQuery.data.trainer_user_id} · Период: {activePlanQuery.data.start_date} —{' '}
                  {activePlanQuery.data.end_date}
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
