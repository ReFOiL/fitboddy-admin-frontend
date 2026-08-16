import { Link } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'

import { useProfile } from '../hooks/use-profile'
import { useClientRelationActions, useClientRelations, useConversations, useUnreadCount, useUserIdGuard } from '../hooks'
import { ClientProfileRequiredCard, IncomingInvitesCard, TrainerSelectionCard } from '../components/client-relations'
import { Button } from '../components/ui/button'
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
        <Card className={unreadCount > 0 ? 'border-primary/50 bg-primary/5' : 'border-primary/20'}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <MessageSquare size={18} className="shrink-0 text-primary" />
                <span className="truncate">{activeRelation.trainer_login?.trim() || 'Ваш тренер'}</span>
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
          <CardContent>
            <Button asChild className="h-12 w-full gap-2 sm:h-10 sm:w-auto">
              <Link to={`${APP_PATHS.messages}?peerUserId=${encodeURIComponent(activeRelation.trainer_user_id)}`}>
                <MessageSquare size={16} />
                {unreadCount > 0 ? 'Открыть сообщения' : 'Написать тренеру'}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <IncomingInvitesCard
        invites={incomingInvites}
        isLoading={incomingInvitesQuery.isLoading}
        isError={incomingInvitesQuery.isError}
        acceptPending={acceptRelationMutation.isPending}
        declinePending={leaveRelationMutation.isPending}
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
        onConnect={(trainerUserId) => {
          if (hasActiveTrainer || createRelationMutation.isPending) return
          connectTrainer(trainerUserId)
        }}
      />
    </div>
  )
}
