import { useProfile } from '../hooks/use-profile'
import { useClientRelationActions, useClientRelations, useUserIdGuard } from '../hooks'
import { ClientProfileRequiredCard, IncomingInvitesCard, TrainerSelectionCard } from '../components/client-relations'
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
  const { acceptInvite, declineInvite, connectTrainer } = useClientRelationActions({
    withUserId,
    acceptRelationMutation,
    leaveRelationMutation,
    createRelationMutation,
  })

  return (
    <div className="space-y-6">
      {mustCompleteQuestionnaire ? <ClientProfileRequiredCard /> : null}

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
