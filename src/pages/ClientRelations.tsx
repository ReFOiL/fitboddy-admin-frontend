import { Check, ClipboardList, Link2, Search, Sparkles, Users, X } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from '../hooks/use-auth'
import { useProfile } from '../hooks/use-profile'
import { useRelations } from '../hooks/use-relations'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import { isProfileCompleted } from '../lib/profile-completion'

export function ClientRelationsPage() {
  const { user } = useAuth()
  const clientUserId = user?.role === 'client' ? user.user_id : ''
  const { trainersQuery, incomingInvitesQuery, clientActiveRelationQuery, createRelationMutation, acceptRelationMutation, leaveRelationMutation } =
    useRelations({
      trainerUserId: '',
      clientUserId,
    })

  const trainers = Array.isArray(trainersQuery.data) ? trainersQuery.data : []
  const incomingInvites = Array.isArray(incomingInvitesQuery.data) ? incomingInvitesQuery.data : []
  const ownUserId = user?.user_id ?? ''
  const { profileQuery } = useProfile(ownUserId)
  const questionnaireReady = isProfileCompleted(profileQuery.data)
  const mustCompleteQuestionnaire = !questionnaireReady
  const activeRelation = clientActiveRelationQuery.data
  const hasActiveTrainer = Boolean(activeRelation?.trainer_user_id)
  const formatIdentity = (params: { login?: string | null; userId: string }) => (params.login?.trim() ? params.login : params.userId)

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
          {incomingInvitesQuery.isError ? <span className="text-sm text-destructive">Не удалось загрузить входящие приглашения.</span> : null}
          {!incomingInvitesQuery.isLoading && !incomingInvitesQuery.isError ? (
            <div className="space-y-3">
              {incomingInvites.length === 0 ? (
                <span className="text-sm text-secondary-foreground">Новых приглашений пока нет.</span>
              ) : (
                incomingInvites.map((invite) => (
                  <div key={invite.relation_id} className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-4 text-sm">
                    <div className="mb-1 flex items-center gap-2">
                      <Users size={16} className="text-primary" />
                      <span className="font-medium">Тренер: {formatIdentity({ login: invite.trainer_login, userId: invite.trainer_user_id })}</span>
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

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search size={18} className="text-primary" />
            Выберите тренера
          </CardTitle>
          <CardDescription>Открытые тренеры доступны ниже. Подключение занимает один клик.</CardDescription>
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
                    <div className="mb-3 text-secondary-foreground">{formatIdentity({ login: trainer.login, userId: trainer.user_id })}</div>
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
                      {createRelationMutation.isPending ? 'Подключаем...' : hasActiveTrainer ? 'Уже подключен' : 'Подключиться'}
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
    </div>
  )
}
