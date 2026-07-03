import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  Link2,
  Link2Off,
  Search,
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react'

import { useAuth } from '../hooks/use-auth'
import { useProfile } from '../hooks/use-profile'
import { useRelations } from '../hooks/use-relations'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import { isProfileCompleted } from '../lib/profile-completion'

export function RelationsPage() {
  const { user } = useAuth()
  const trainerUserId = user?.role === 'trainer' ? user.user_id : ''
  const clientUserId = user?.role === 'client' ? user.user_id : ''
  const [myClientsPage, setMyClientsPage] = useState(1)
  const [myClientsSearch, setMyClientsSearch] = useState('')
  const myClientsSearchDeferred = useDeferredValue(myClientsSearch)
  const {
    trainerClientsPaginatedQuery,
    trainerPublicationStatusQuery,
    trainersQuery,
    incomingInvitesQuery,
    clientActiveRelationQuery,
    createRelationMutation,
    acceptRelationMutation,
    upsertDiscoveryProfileMutation,
    leaveRelationMutation,
  } = useRelations({
    trainerUserId,
    clientUserId,
    trainerClientsPage: {
      status: 'active',
      page: myClientsPage,
      pageSize: 6,
      search: myClientsSearchDeferred,
    },
  })
  const trainers = Array.isArray(trainersQuery.data) ? trainersQuery.data : []
  const incomingInvites = Array.isArray(incomingInvitesQuery.data) ? incomingInvitesQuery.data : []
  const isTrainer = user?.role === 'trainer'
  const isClient = user?.role === 'client'
  const selfVisibleAsTrainer = Boolean(trainerPublicationStatusQuery.data?.is_published)
  const trainerVisibilityLabel = trainerPublicationStatusQuery.isLoading
    ? 'Проверяем...'
    : trainerPublicationStatusQuery.isError
      ? 'Не удалось определить'
      : selfVisibleAsTrainer
        ? 'Виден клиентам'
        : 'Не опубликован'
  const trainerVisibilityToggleDisabled =
    upsertDiscoveryProfileMutation.isPending || trainerPublicationStatusQuery.isLoading || trainerPublicationStatusQuery.isError
  const formatIdentity = (params: { login?: string | null; userId: string }) =>
    params.login?.trim() ? params.login : params.userId
  const formatClientCardTitle = (relation: (typeof myClients)[number]): string =>
    relation.client_display_name?.trim() || relation.client_login?.trim() || 'Клиент'
  const formatClientCardSubtitle = (relation: (typeof myClients)[number]): string | null => {
    const displayName = relation.client_display_name?.trim()
    const login = relation.client_login?.trim()
    if (!displayName || !login) return null
    if (displayName.toLowerCase() === login.toLowerCase()) return null
    return `@${login}`
  }
  const formatJoinedDate = (value: string): string => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Дата неизвестна'
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
  }
  const ownUserId = user?.user_id ?? ''
  const { profileQuery } = useProfile(ownUserId)
  const questionnaireReady = isProfileCompleted(profileQuery.data)
  const mustCompleteQuestionnaire = isClient && !questionnaireReady
  const myClientsPageData = trainerClientsPaginatedQuery.data
  const myClients = myClientsPageData?.items ?? []
  const myClientsTotal = myClientsPageData?.total ?? 0
  const myClientsTotalPages = myClientsPageData?.total_pages ?? 1
  const myClientsPageSize = myClientsPageData?.page_size ?? 6
  const myClientsRangeStart = myClientsTotal === 0 ? 0 : (myClientsPage - 1) * myClientsPageSize + 1
  const myClientsRangeEnd = Math.min(myClientsPage * myClientsPageSize, myClientsTotal)
  const activeRelation = clientActiveRelationQuery.data
  const hasActiveTrainer = Boolean(activeRelation?.trainer_user_id)

  return (
    <div className="space-y-6">
      {mustCompleteQuestionnaire ? (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-300">
              <ClipboardList size={18} />
              Сначала профиль
            </CardTitle>
            <CardDescription>
              Перед поиском и подключением тренера нужно заполнить профиль в разделе{' '}
              <Link to="/profile" className="underline decoration-dotted underline-offset-4">
                «Профиль и цели»
              </Link>
              .
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="overflow-hidden border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye size={18} className="text-primary" />
            Видимость профиля
          </CardTitle>
          <CardDescription>
            Вы можете в любой момент публиковать профиль для поиска и скрывать его обратно.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {isTrainer ? (
            <div className="rounded-xl border border-border/70 bg-secondary/30 p-3">
              <span className="mb-3 block text-sm">
                Статус тренера в поиске: {trainerVisibilityLabel}
              </span>
              <Button
                size="sm"
                onClick={() => {
                  if (!user?.user_id) return
                  upsertDiscoveryProfileMutation.mutate({
                    userId: user.user_id,
                    payload: {
                      role: 'trainer',
                      is_visible: !selfVisibleAsTrainer,
                      looking_for_trainer: false,
                    },
                  })
                }}
                disabled={trainerVisibilityToggleDisabled}
              >
                {selfVisibleAsTrainer ? 'Скрыть профиль тренера' : 'Опубликовать профиль тренера'}
              </Button>
            </div>
          ) : null}
          {isClient ? (
            <div className="rounded-xl border border-border/70 bg-secondary/30 p-3">
              <span className="mb-3 block text-sm">Опубликуйте профиль, чтобы тренеры могли отправлять приглашения.</span>
              <Button
                size="sm"
                onClick={() => {
                  if (!user?.user_id) return
                  upsertDiscoveryProfileMutation.mutate({
                    userId: user.user_id,
                    payload: {
                      role: 'client',
                      is_visible: true,
                      looking_for_trainer: true,
                    },
                  })
                }}
                disabled={upsertDiscoveryProfileMutation.isPending || mustCompleteQuestionnaire}
              >
                Опубликовать профиль клиента
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isClient ? (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles size={18} className="text-primary" />
              Входящие приглашения
            </CardTitle>
            <CardDescription>Тренеры, которые пригласили вас в сопровождение.</CardDescription>
          </CardHeader>
          <CardContent>
            {incomingInvitesQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            ) : null}
            {incomingInvitesQuery.isError ? (
              <span className="text-sm text-destructive">Не удалось загрузить входящие приглашения.</span>
            ) : null}
            {!incomingInvitesQuery.isLoading && !incomingInvitesQuery.isError ? (
              <div className="space-y-3">
                {incomingInvites.length === 0 ? (
                  <span className="text-sm text-secondary-foreground">Новых приглашений пока нет.</span>
                ) : (
                  incomingInvites.map((invite) => (
                    <div key={invite.relation_id} className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-4 text-sm">
                      <div className="mb-1 flex items-center gap-2">
                        <Users size={16} className="text-primary" />
                        <span className="font-medium">
                          Тренер: {formatIdentity({ login: invite.trainer_login, userId: invite.trainer_user_id })}
                        </span>
                      </div>
                      <div className="mb-3 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary">
                        Статус: приглашение
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!user?.user_id) return
                            acceptRelationMutation.mutate({
                              relationId: invite.relation_id,
                              actingUserId: user.user_id,
                            })
                          }}
                          disabled={acceptRelationMutation.isPending}
                        >
                          <Check size={14} />
                          Принять
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (!user?.user_id) return
                            leaveRelationMutation.mutate({
                              relationId: invite.relation_id,
                              actingUserId: user.user_id,
                            })
                          }}
                          disabled={leaveRelationMutation.isPending}
                        >
                          <X size={14} />
                          Отклонить
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {isClient ? (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search size={18} className="text-primary" />
              Выберите тренера
            </CardTitle>
            <CardDescription>
              Открытые тренеры доступны ниже. Подключение занимает один клик.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trainersQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            ) : null}
            {trainersQuery.isError ? <span className="text-sm text-destructive">Не удалось загрузить список тренеров.</span> : null}
            {!trainersQuery.isLoading && !trainersQuery.isError ? (
              <div className="space-y-3">
                {trainers.length === 0 ? (
                  <span className="text-sm text-secondary-foreground">Пока нет доступных тренеров.</span>
                ) : (
                  trainers.map((trainer) => (
                    <div key={trainer.user_id} className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-4 text-sm">
                      <div className="mb-1 flex items-center gap-2">
                        <Users size={16} className="text-primary" />
                        <span className="font-medium">Тренер</span>
                      </div>
                      <div className="mb-3 text-secondary-foreground">
                        {formatIdentity({ login: trainer.login, userId: trainer.user_id })}
                      </div>
                      <div className="mb-3 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary">
                        Профиль подтвержден
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!user?.user_id) return
                          if (hasActiveTrainer || createRelationMutation.isPending) return
                          createRelationMutation.mutate({
                            acting_user_id: user.user_id,
                            trainer_user_id: trainer.user_id,
                            client_user_id: user.user_id,
                            mode: 'direct',
                          })
                        }}
                        disabled={
                          createRelationMutation.isPending ||
                          mustCompleteQuestionnaire ||
                          clientActiveRelationQuery.isLoading ||
                          clientActiveRelationQuery.isError ||
                          hasActiveTrainer
                        }
                      >
                        <Link2 size={14} />
                        {createRelationMutation.isPending
                          ? 'Подключаем...'
                          : hasActiveTrainer
                            ? 'Уже подключен'
                            : 'Подключиться'}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            ) : null}
            {!clientActiveRelationQuery.isLoading && !clientActiveRelationQuery.isError && hasActiveTrainer ? (
              <span className="text-sm text-secondary-foreground">
                Активная связь уже есть. Завершите текущую связь, чтобы выбрать другого тренера.
              </span>
            ) : null}
            {clientActiveRelationQuery.isError ? (
              <span className="text-sm text-destructive">Не удалось проверить активную связь с тренером.</span>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {isTrainer ? (
        <>
          <Card className="overflow-hidden border-primary/20">
            <CardHeader className="border-b border-border/60 bg-gradient-to-b from-primary/10 to-transparent">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users size={18} className="text-primary" />
                    Клиенты
                  </CardTitle>
                  <CardDescription className="mt-1">Управляйте текущими клиентами.</CardDescription>
                </div>
                <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {myClientsTotal}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="rounded-xl border border-border/70 bg-secondary/20 p-3">
                <label htmlFor="trainer_clients_search" className="mb-2 block text-xs font-medium text-secondary-foreground">
                  Поиск клиента
                </label>
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary-foreground" />
                  <Input
                    id="trainer_clients_search"
                    className="pl-9"
                    value={myClientsSearch}
                    onChange={(event) => {
                      setMyClientsSearch(event.target.value)
                      setMyClientsPage(1)
                    }}
                    placeholder="Имя или логин"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-secondary/15 p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-xs text-secondary-foreground">
                  <span>
                    Показано {myClientsRangeStart}-{myClientsRangeEnd} из {myClientsTotal}
                  </span>
                  <span>
                    Страница {myClientsPage} из {myClientsTotalPages}
                  </span>
                </div>

                {trainerClientsPaginatedQuery.isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <Skeleton className="h-28 w-full rounded-xl" />
                  </div>
                ) : null}
                {trainerClientsPaginatedQuery.isError ? (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    Не удалось загрузить список активных клиентов.
                  </div>
                ) : null}
                {!trainerClientsPaginatedQuery.isLoading && !trainerClientsPaginatedQuery.isError ? (
                  <>
                    <div className="space-y-2.5">
                      {myClients.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/70 bg-secondary/20 px-4 py-4 text-sm text-secondary-foreground">
                          <span>По текущим фильтрам клиентов не найдено.</span>
                          {myClientsSearch.trim() ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="mt-3 w-full sm:w-auto"
                              onClick={() => {
                                setMyClientsSearch('')
                                setMyClientsPage(1)
                              }}
                            >
                              Очистить поиск
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        myClients.map((relation) => (
                          <div
                            key={relation.relation_id}
                            className="rounded-2xl border border-border/70 bg-secondary/30 p-4 text-sm transition hover:border-primary/40"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                  <UserCheck size={16} className="shrink-0 text-primary" />
                                  <span className="truncate text-base font-semibold">{formatClientCardTitle(relation)}</span>
                                </div>
                                {formatClientCardSubtitle(relation) ? (
                                  <div className="text-xs text-secondary-foreground">{formatClientCardSubtitle(relation)}</div>
                                ) : null}
                              </div>
                              <div className="inline-flex shrink-0 items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">
                                Активен
                              </div>
                            </div>
                            <div className="mt-3 text-xs text-secondary-foreground">С нами с {formatJoinedDate(relation.created_at)}</div>
                            <div className="mt-4 grid gap-2 sm:flex sm:gap-2">
                              <Button asChild size="sm" className="w-full sm:w-auto">
                                <Link to={`/profile?client=${encodeURIComponent(relation.client_user_id)}`}>Открыть профиль</Link>
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="w-full border border-destructive/40 text-destructive hover:bg-destructive/10 sm:w-auto"
                                onClick={() => {
                                  if (!user?.user_id) return
                                  leaveRelationMutation.mutate({
                                    relationId: relation.relation_id,
                                    actingUserId: user.user_id,
                                  })
                                }}
                                disabled={leaveRelationMutation.isPending}
                              >
                                <Link2Off size={14} className="shrink-0" />
                                Завершить
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-3 rounded-xl border border-border/70 bg-secondary/20 px-3 py-3 text-xs text-secondary-foreground">
                      <div className="mb-2 text-center">
                        Страница {myClientsPage} из {myClientsTotalPages}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setMyClientsPage((current) => Math.max(1, current - 1))}
                          disabled={myClientsPage <= 1}
                          className="w-full"
                        >
                          <ChevronLeft size={14} />
                          Назад
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setMyClientsPage((current) => Math.min(myClientsTotalPages, current + 1))}
                          disabled={myClientsPage >= myClientsTotalPages}
                          className="w-full"
                        >
                          Вперед
                          <ChevronRight size={14} />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
