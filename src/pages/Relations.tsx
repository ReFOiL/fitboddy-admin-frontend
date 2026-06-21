import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { isProfileCompleted } from '../lib/profile-completion'

export function RelationsPage() {
  const { user } = useAuth()
  const trainerUserId = user?.role === 'trainer' ? user.user_id : ''
  const clientUserId = user?.role === 'client' ? user.user_id : ''
  const [trainerMarketplaceTab, setTrainerMarketplaceTab] = useState<'my-clients' | 'clients-looking'>('my-clients')
  const [myClientsPage, setMyClientsPage] = useState(1)
  const [myClientsSearch, setMyClientsSearch] = useState('')
  const [clientsLookingPage, setClientsLookingPage] = useState(1)
  const [clientsLookingSearch, setClientsLookingSearch] = useState('')
  const myClientsSearchDeferred = useDeferredValue(myClientsSearch)
  const clientsLookingSearchDeferred = useDeferredValue(clientsLookingSearch)
  const {
    trainerClientsPaginatedQuery,
    trainerInvitesQuery,
    trainerDeclinedRelationsQuery,
    trainerEndedRelationsQuery,
    trainersQuery,
    clientsLookingQuery,
    clientsLookingPaginatedQuery,
    incomingInvitesQuery,
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
    clientsLookingPage: {
      page: clientsLookingPage,
      pageSize: 6,
      search: clientsLookingSearchDeferred,
    },
  })
  const trainerInvites = Array.isArray(trainerInvitesQuery.data) ? trainerInvitesQuery.data : []
  const trainerDeclinedRelations = Array.isArray(trainerDeclinedRelationsQuery.data)
    ? trainerDeclinedRelationsQuery.data
    : []
  const trainerEndedRelations = Array.isArray(trainerEndedRelationsQuery.data) ? trainerEndedRelationsQuery.data : []
  const trainers = Array.isArray(trainersQuery.data) ? trainersQuery.data : []
  const clientsLooking = Array.isArray(clientsLookingQuery.data) ? clientsLookingQuery.data : []
  const incomingInvites = Array.isArray(incomingInvitesQuery.data) ? incomingInvitesQuery.data : []
  const isTrainer = user?.role === 'trainer'
  const isClient = user?.role === 'client'
  const selfVisibleAsTrainer = Boolean(user?.user_id && trainers.some((trainer) => trainer.user_id === user.user_id))
  const selfVisibleAsClient = Boolean(user?.user_id && clientsLooking.some((client) => client.user_id === user.user_id))
  const ownUserId = user?.user_id ?? ''
  const { profileQuery } = useProfile(ownUserId)
  const questionnaireReady = isProfileCompleted(profileQuery.data)
  const mustCompleteQuestionnaire = isClient && !questionnaireReady
  const myClientsPageData = trainerClientsPaginatedQuery.data
  const myClients = myClientsPageData?.items ?? []
  const myClientsTotal = myClientsPageData?.total ?? 0
  const myClientsTotalPages = myClientsPageData?.total_pages ?? 1
  const clientsLookingPageData = clientsLookingPaginatedQuery.data
  const clientsLookingPaged = clientsLookingPageData?.items ?? []
  const clientsLookingTotal = clientsLookingPageData?.total ?? 0
  const clientsLookingTotalPages = clientsLookingPageData?.total_pages ?? 1

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
            Для поиска по платформе профиль должен быть опубликован. Это делается один раз и потом работает автоматически.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {isTrainer ? (
            <div className="rounded-xl border border-border/70 bg-secondary/30 p-3">
              <span className="mb-3 block text-sm">
                Статус тренера в поиске: {selfVisibleAsTrainer ? 'Виден клиентам' : 'Не опубликован'}
              </span>
              <Button
                size="sm"
                onClick={() => {
                  if (!user?.user_id) return
                  upsertDiscoveryProfileMutation.mutate({
                    userId: user.user_id,
                    payload: {
                      role: 'trainer',
                      is_visible: true,
                      looking_for_trainer: false,
                    },
                  })
                }}
                disabled={upsertDiscoveryProfileMutation.isPending}
              >
                Опубликовать профиль тренера
              </Button>
            </div>
          ) : null}
          {isClient ? (
            <div className="rounded-xl border border-border/70 bg-secondary/30 p-3">
              <span className="mb-3 block text-sm">
                Статус клиента в поиске: {selfVisibleAsClient ? 'Ищу тренера' : 'Не опубликован'}
              </span>
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
                        <span className="font-medium">Тренер: {invite.trainer_user_id}</span>
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
                      <div className="mb-3 text-secondary-foreground">{trainer.user_id}</div>
                      <div className="mb-3 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary">
                        Профиль подтвержден
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!user?.user_id) return
                          createRelationMutation.mutate({
                            acting_user_id: user.user_id,
                            trainer_user_id: trainer.user_id,
                            client_user_id: user.user_id,
                            mode: 'direct',
                          })
                        }}
                        disabled={createRelationMutation.isPending || mustCompleteQuestionnaire}
                      >
                        <Link2 size={14} />
                        Подключиться
                      </Button>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {isTrainer ? (
        <>
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock3 size={18} className="text-primary" />
                Мои приглашения
              </CardTitle>
              <CardDescription>Кому отправлено приглашение и что с ним сейчас.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {trainerInvitesQuery.isLoading || trainerDeclinedRelationsQuery.isLoading || trainerEndedRelationsQuery.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
              ) : null}
              {trainerInvitesQuery.isError || trainerDeclinedRelationsQuery.isError || trainerEndedRelationsQuery.isError ? (
                <span className="text-sm text-destructive">Не удалось загрузить историю приглашений.</span>
              ) : null}
              {!trainerInvitesQuery.isLoading &&
              !trainerDeclinedRelationsQuery.isLoading &&
              !trainerEndedRelationsQuery.isLoading &&
              !trainerInvitesQuery.isError &&
              !trainerDeclinedRelationsQuery.isError &&
              !trainerEndedRelationsQuery.isError ? (
                <>
                  <div className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-secondary-foreground">Ожидают ответа</div>
                    {trainerInvites.length === 0 ? (
                      <span className="text-sm text-secondary-foreground">Сейчас нет ожидающих приглашений.</span>
                    ) : (
                      trainerInvites.map((relation) => (
                        <div
                          key={relation.relation_id}
                          className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-3 text-sm"
                        >
                          <div className="mb-1 flex items-center gap-2">
                            <Users size={16} className="text-primary" />
                            <span className="font-medium">Клиент: {relation.client_user_id}</span>
                          </div>
                          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary">
                            Статус: ожидает решения
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-secondary-foreground">
                      Отклоненные приглашения
                    </div>
                    {trainerDeclinedRelations.length === 0 ? (
                      <span className="text-sm text-secondary-foreground">Пока нет отклоненных приглашений.</span>
                    ) : (
                      trainerDeclinedRelations.map((relation) => (
                        <div
                          key={relation.relation_id}
                          className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-3 text-sm"
                        >
                          <div className="mb-1 flex items-center gap-2">
                            <X size={16} className="text-destructive" />
                            <span className="font-medium">Клиент: {relation.client_user_id}</span>
                          </div>
                          <div className="inline-flex items-center rounded-full border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
                            Статус: отклонено
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-secondary-foreground">
                      Завершенные связи
                    </div>
                    {trainerEndedRelations.length === 0 ? (
                      <span className="text-sm text-secondary-foreground">Пока нет завершенных связей.</span>
                    ) : (
                      trainerEndedRelations.map((relation) => (
                        <div
                          key={relation.relation_id}
                          className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-3 text-sm"
                        >
                          <div className="mb-1 flex items-center gap-2">
                            <Link2Off size={16} className="text-destructive" />
                            <span className="font-medium">Клиент: {relation.client_user_id}</span>
                          </div>
                          <div className="inline-flex items-center rounded-full border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
                            Статус: завершено
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={18} className="text-primary" />
                Клиенты
              </CardTitle>
              <CardDescription>Управляйте текущими клиентами и находите новых, которые сейчас ищут тренера.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={trainerMarketplaceTab} onValueChange={(value) => setTrainerMarketplaceTab(value as 'my-clients' | 'clients-looking')}>
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="my-clients">Мои клиенты</TabsTrigger>
                  <TabsTrigger value="clients-looking">Клиенты в поиске тренера</TabsTrigger>
                </TabsList>

                <TabsContent value="my-clients" className="space-y-4">
                  <div className="space-y-3">
                    <Input
                      value={myClientsSearch}
                      onChange={(event) => {
                        setMyClientsSearch(event.target.value)
                        setMyClientsPage(1)
                      }}
                      placeholder="Поиск по имени клиента"
                    />
                  </div>

                  {trainerClientsPaginatedQuery.isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-28 w-full rounded-xl" />
                      <Skeleton className="h-28 w-full rounded-xl" />
                    </div>
                  ) : null}
                  {trainerClientsPaginatedQuery.isError ? (
                    <span className="text-sm text-destructive">Не удалось загрузить список активных клиентов.</span>
                  ) : null}
                  {!trainerClientsPaginatedQuery.isLoading && !trainerClientsPaginatedQuery.isError ? (
                    <>
                      <div className="space-y-2">
                        {myClients.length === 0 ? (
                          <span className="text-sm text-secondary-foreground">По текущим фильтрам клиентов не найдено.</span>
                        ) : (
                          myClients.map((relation) => (
                            <div
                              key={relation.relation_id}
                              className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-4 text-sm"
                            >
                              <div className="mb-1 flex items-center gap-2">
                                <UserCheck size={16} className="text-primary" />
                                <span className="font-medium">{relation.client_display_name || relation.client_user_id}</span>
                              </div>
                              {relation.client_display_name ? (
                                <div className="mb-2 text-xs text-secondary-foreground">{relation.client_user_id}</div>
                              ) : null}
                              <div className="mb-3 inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">
                                Статус: активен
                              </div>
                              <div className="mb-3 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary">
                                Источник: {relation.source === 'invite' ? 'приглашение' : 'прямое подключение'}
                              </div>
                              <div className="flex gap-2">
                                <Button asChild size="sm">
                                  <Link to={`/profile?client=${encodeURIComponent(relation.client_user_id)}`}>Открыть профиль</Link>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    if (!user?.user_id) return
                                    leaveRelationMutation.mutate({
                                      relationId: relation.relation_id,
                                      actingUserId: user.user_id,
                                    })
                                  }}
                                  disabled={leaveRelationMutation.isPending}
                                >
                                  <Link2Off size={14} />
                                  Завершить
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/20 px-3 py-2 text-xs text-secondary-foreground">
                        <span>Всего: {myClientsTotal}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setMyClientsPage((current) => Math.max(1, current - 1))}
                            disabled={myClientsPage <= 1}
                          >
                            <ChevronLeft size={14} />
                            Назад
                          </Button>
                          <span>
                            Страница {myClientsPage} из {myClientsTotalPages}
                          </span>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setMyClientsPage((current) => Math.min(myClientsTotalPages, current + 1))}
                            disabled={myClientsPage >= myClientsTotalPages}
                          >
                            Вперед
                            <ChevronRight size={14} />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : null}
                </TabsContent>

                <TabsContent value="clients-looking" className="space-y-4">
                  <Input
                    value={clientsLookingSearch}
                    onChange={(event) => {
                      setClientsLookingSearch(event.target.value)
                      setClientsLookingPage(1)
                    }}
                    placeholder="Поиск по имени клиента"
                  />

                  {clientsLookingPaginatedQuery.isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-24 w-full rounded-xl" />
                      <Skeleton className="h-24 w-full rounded-xl" />
                    </div>
                  ) : null}
                  {clientsLookingPaginatedQuery.isError ? (
                    <span className="text-sm text-destructive">Не удалось загрузить список клиентов.</span>
                  ) : null}
                  {!clientsLookingPaginatedQuery.isLoading && !clientsLookingPaginatedQuery.isError ? (
                    <>
                      <div className="space-y-3">
                        {clientsLookingPaged.length === 0 ? (
                          <span className="text-sm text-secondary-foreground">Сейчас нет клиентов в поиске.</span>
                        ) : (
                          clientsLookingPaged.map((client) => (
                            <div key={client.user_id} className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-4 text-sm">
                              <div className="mb-1 flex items-center gap-2">
                                <Sparkles size={16} className="text-primary" />
                                <span className="font-medium">Клиент</span>
                              </div>
                              <div className="mb-3 text-secondary-foreground">{client.user_id}</div>
                              {client.display_name ? <div className="mb-2 font-medium">{client.display_name}</div> : null}
                              <div className="mb-3 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary">
                                Готов к сотрудничеству
                              </div>
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (!trainerUserId) return
                                  createRelationMutation.mutate({
                                    acting_user_id: trainerUserId,
                                    trainer_user_id: trainerUserId,
                                    client_user_id: client.user_id,
                                    mode: 'invite',
                                  })
                                }}
                                disabled={createRelationMutation.isPending}
                              >
                                <Link2 size={14} />
                                Пригласить
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/20 px-3 py-2 text-xs text-secondary-foreground">
                        <span>Всего: {clientsLookingTotal}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setClientsLookingPage((current) => Math.max(1, current - 1))}
                            disabled={clientsLookingPage <= 1}
                          >
                            <ChevronLeft size={14} />
                            Назад
                          </Button>
                          <span>
                            Страница {clientsLookingPage} из {clientsLookingTotalPages}
                          </span>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setClientsLookingPage((current) => Math.min(clientsLookingTotalPages, current + 1))}
                            disabled={clientsLookingPage >= clientsLookingTotalPages}
                          >
                            Вперед
                            <ChevronRight size={14} />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : null}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
