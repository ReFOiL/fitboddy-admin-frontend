import { Link } from 'react-router-dom'
import { Eye, MessageSquare, UserMinus } from 'lucide-react'

import { useProfile } from '../hooks/use-profile'
import { useClientRelationActions, useClientRelations, useConversations, useUnreadCount, useUserIdGuard } from '../hooks'
import { ClientProfileRequiredCard, IncomingInvitesCard, TrainerSelectionCard } from '../components/client-relations'
import { Button } from '../components/ui/button'
import { Avatar } from '../components/ui/kit'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { APP_PATHS } from '../config'
import { formatLastMessagePreview } from '../lib/messages-formatters'
import { isProfileCompleted } from '../lib/profile-completion'

export function ClientRelationsPage() {
  const { user, userId, withUserId } = useUserIdGuard()
  const clientUserId = user?.role === 'client' ? userId : ''
  const { trainersQuery, incomingInvitesQuery, clientActiveRelationQuery, createRelationMutation, acceptRelationMutation, leaveRelationMutation } =
    useClientRelations({ clientUserId })

  const trainers = Array.isArray(trainersQuery.data) ? trainersQuery.data : []
  const incomingInvites = Array.isArray(incomingInvitesQuery.data) ? incomingInvitesQuery.data : []
  const { profileQuery } = useProfile(userId)
  const questionnaireReady = isProfileCompleted(profileQuery.data)
  const mustCompleteQuestionnaire = !questionnaireReady
  const activeRelation = clientActiveRelationQuery.data
  const hasActiveTrainer = Boolean(activeRelation?.trainer_user_id)
  const unreadQuery = useUnreadCount(hasActiveTrainer)
  const conversationsQuery = useConversations(hasActiveTrainer, 15_000)
  const trainerConversation = (conversationsQuery.data ?? []).find(
    (item) => item.trainer_user_id === activeRelation?.trainer_user_id,
  )
  const unreadCount = trainerConversation?.unread_count ?? unreadQuery.data?.unread_count ?? 0
  const lastPreview = trainerConversation
    ? formatLastMessagePreview(trainerConversation.last_message, user?.user_id)
    : null
  const trainerDirectory = trainers.find((item) => item.user_id === activeRelation?.trainer_user_id)
  const trainerName = trainerDirectory?.display_name?.trim() || 'Тренер'
  const { acceptInvite, declineInvite, connectTrainer } = useClientRelationActions({
    withUserId,
    acceptRelationMutation,
    leaveRelationMutation,
    createRelationMutation,
  })

  return (
    <div className="space-y-6">
      {mustCompleteQuestionnaire ? <ClientProfileRequiredCard /> : null}

      {activeRelation?.trainer_user_id ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-3">
                <Avatar name={trainerName} />
                <span className="min-w-0">
                  <span className="block truncate text-[17px]">{trainerName}</span>
                  <span className="block text-[13px] font-normal text-secondary-foreground">Ваш тренер</span>
                </span>
              </span>
              {unreadCount > 0 ? (
                <span className="inline-flex min-w-5 shrink-0 justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  {unreadCount}
                </span>
              ) : null}
            </CardTitle>
            <CardDescription>
              {unreadCount > 0
                ? lastPreview && lastPreview !== 'Нет сообщений'
                  ? lastPreview
                  : `Новых сообщений: ${unreadCount}`
                : 'Напишите тренеру — переписка откроется сразу.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:flex">
            <Button asChild variant="secondary" className="h-12 w-full gap-2">
              <Link
                to={APP_PATHS.trainerProfile.replace(
                  ':trainerUserId',
                  encodeURIComponent(activeRelation.trainer_user_id),
                )}
              >
                <Eye size={16} />
                Профиль
              </Link>
            </Button>
            <Button asChild className="h-12 w-full gap-2">
              <Link to={`${APP_PATHS.messages}?peerUserId=${encodeURIComponent(activeRelation.trainer_user_id)}`}>
                <MessageSquare size={16} />
                {unreadCount > 0 ? 'Открыть сообщения' : 'Написать тренеру'}
              </Link>
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="col-span-2 h-12 w-full gap-2"
              disabled={leaveRelationMutation.isPending}
              onClick={() => {
                if (
                  !window.confirm(
                    'Отписаться от тренера? Активное сопровождение будет завершено, после чего можно будет выбрать другого тренера.',
                  )
                ) {
                  return
                }
                leaveRelationMutation.mutate({ relationId: activeRelation.relation_id })
              }}
            >
              <UserMinus size={16} />
              {leaveRelationMutation.isPending ? 'Отписываем…' : 'Отписаться'}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!hasActiveTrainer ? (
        <>
          <IncomingInvitesCard
            invites={incomingInvites}
            isLoading={incomingInvitesQuery.isLoading}
            isError={incomingInvitesQuery.isError}
            acceptPending={acceptRelationMutation.isPending}
            declinePending={leaveRelationMutation.isPending}
            onRetry={() => void incomingInvitesQuery.refetch()}
            onAccept={acceptInvite}
            onDecline={declineInvite}
          />

          <TrainerSelectionCard
            trainers={trainers}
            isLoading={trainersQuery.isLoading}
            isError={trainersQuery.isError}
            hasActiveTrainer={hasActiveTrainer}
            isActiveRelationLoading={clientActiveRelationQuery.isLoading}
            isActiveRelationError={clientActiveRelationQuery.isError}
            mustCompleteQuestionnaire={mustCompleteQuestionnaire}
            createPending={createRelationMutation.isPending}
            onRetry={() => void trainersQuery.refetch()}
            onRetryActiveRelation={() => void clientActiveRelationQuery.refetch()}
            onConnect={(trainerUserId) => {
              if (hasActiveTrainer || createRelationMutation.isPending) return
              connectTrainer(trainerUserId)
            }}
          />
        </>
      ) : null}
    </div>
  )
}
