import axios from 'axios'
import { ArrowLeft, Scale, Target, UserCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../hooks/use-auth'
import { useProfile } from '../hooks/use-profile'
import { useTrainerRelations } from '../hooks'
import { useClientLoads } from '../hooks/use-plans'
import { listTrainerExercises } from '../api/exercises'
import { queryKeys } from '../api/queryKeys'
import { formatEquipmentLabel } from '../lib/equipment'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Label } from '../components/ui/label'
import { Skeleton } from '../components/ui/skeleton'
import { StyledSelect } from '../components/ui/styled-select'

function textOrPlaceholder(value: string | null | undefined): string {
  const normalized = value?.trim()
  return normalized ? normalized : 'Не указано'
}

export function TrainerClientProfilePage() {
  const { user } = useAuth()
  const isTrainer = user?.role === 'trainer'
  const trainerUserId = isTrainer ? user.user_id : ''
  const location = useLocation()
  const [targetUserId, setTargetUserId] = useState(() => {
    const state = location.state
    if (!state || typeof state !== 'object') return ''
    const clientUserId = (state as { clientUserId?: unknown }).clientUserId
    if (typeof clientUserId !== 'string') return ''
    return clientUserId.trim()
  })

  const { trainerClientsQuery } = useTrainerRelations({ trainerUserId })
  const trainerClients = Array.isArray(trainerClientsQuery.data) ? trainerClientsQuery.data : []

  const formatClientLabel = (relation: (typeof trainerClients)[number]): string => {
    const displayName = relation.client_display_name?.trim()
    if (displayName) return displayName
    const login = relation.client_login?.trim()
    if (login) return `@${login}`
    return 'Клиент'
  }
  const resolvedTargetUserId = trainerClients.some((relation) => relation.client_user_id === targetUserId)
    ? targetUserId
    : (trainerClients[0]?.client_user_id ?? '')

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
  const profile = profileQuery.data

  const { loadsQuery } = useClientLoads(profileTargetUserId, trainerUserId)
  const catalogQuery = useQuery({
    queryKey: queryKeys.exercises.trainerCatalog(trainerUserId, false),
    queryFn: async () => listTrainerExercises(trainerUserId, false),
    enabled: Boolean(trainerUserId),
  })
  const weightExercises = (catalogQuery.data ?? []).filter(
    (exercise) => exercise.is_active && exercise.default_weight_kg != null && exercise.default_weight_kg > 0,
  )
  const filledLoads = new Set((loadsQuery.data ?? []).map((item) => item.exercise_row_id))
  const filledWeightCount = weightExercises.filter((exercise) => filledLoads.has(exercise.row_id)).length
  const weightsReady = weightExercises.length === 0 || filledWeightCount === weightExercises.length

  const goalLabel = metaQuery.data?.goals.find((item) => item.value === profile?.goal)?.label ?? textOrPlaceholder(profile?.goal)
  const levelLabel =
    metaQuery.data?.levels.find((item) => item.value === profile?.experience_level)?.label ?? textOrPlaceholder(profile?.experience_level)
  const locationLabel =
    metaQuery.data?.workout_locations.find((item) => item.value === profile?.workout_location)?.label ??
    textOrPlaceholder(profile?.workout_location)
  const unavailableLabels =
    profile?.unavailable_equipment?.map((value) => formatEquipmentLabel(value, metaQuery.data?.equipment)) ?? []

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
                Профиль клиента
              </CardTitle>
              <CardDescription className="mt-1">
                Отдельная страница для тренера: просмотр профиля без режима редактирования.
              </CardDescription>
              <div className="mt-2 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary">
                Только просмотр
              </div>
            </div>
            <Button asChild size="sm" variant="secondary" className="w-full sm:w-auto">
              <Link to="/clients">
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
              onChange={(selected) => {
                if (!selected) return
                setTargetUserId(selected)
              }}
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
        <Card className="overflow-hidden border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck size={18} className="text-primary" />
              {selectedRelation ? formatClientLabel(selectedRelation) : 'Профиль клиента'}
            </CardTitle>
            <CardDescription>Актуальные данные клиента доступны в режиме просмотра.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {profileQuery.isFetching ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-20 w-full rounded-xl" />
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

            {profile && !profileQuery.isFetching ? (
              <div className="grid gap-3 sm:gap-4 lg:grid-cols-5">
                <div className="rounded-xl border border-border/70 bg-secondary/15 p-4 lg:col-span-2">
                  <div className="flex items-start gap-4">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Аватар клиента" className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/40" />
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
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-border/70 bg-background/50 p-3 text-sm">
                    <Scale size={16} className="mt-0.5 text-primary" />
                    <div>
                      <div className="font-medium">Рабочие веса</div>
                      <div className="text-xs text-secondary-foreground">
                        {catalogQuery.isLoading || loadsQuery.isLoading
                          ? 'Загрузка...'
                          : weightExercises.length === 0
                            ? 'В каталоге нет силовых упражнений с весом.'
                            : weightsReady
                              ? `Заполнены (${filledWeightCount}/${weightExercises.length})`
                              : `Частично заполнены (${filledWeightCount}/${weightExercises.length}) — план может опираться на дефолты каталога`}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 rounded-xl border border-border/70 bg-secondary/15 p-4 lg:col-span-3">
                  <div className="grid gap-3 sm:grid-cols-2">
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
                          {unavailableLabels.map((item) => (
                            <span key={item} className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-xs">
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-secondary-foreground">Исключений нет (считаем, что есть всё)</span>
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
      ) : null}
    </div>
  )
}
