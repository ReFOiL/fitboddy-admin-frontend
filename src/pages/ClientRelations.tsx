import { useAuth } from '../hooks/use-auth'
import { useProfile } from '../hooks/use-profile'
import { useRelations } from '../hooks/use-relations'
import { ClientProfileRequiredCard } from '../components/client-relations/ClientProfileRequiredCard'
import { IncomingInvitesCard } from '../components/client-relations/IncomingInvitesCard'
import { TrainerSelectionCard } from '../components/client-relations/TrainerSelectionCard'
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

  return (
    <div className="space-y-6">
      {mustCompleteQuestionnaire ? <ClientProfileRequiredCard /> : null}

      <IncomingInvitesCard
        invites={incomingInvites}
        isLoading={incomingInvitesQuery.isLoading}
        isError={incomingInvitesQuery.isError}
        acceptPending={acceptRelationMutation.isPending}
        declinePending={leaveRelationMutation.isPending}
        onAccept={(relationId) => {
          if (!user?.user_id) return
          acceptRelationMutation.mutate({
            relationId,
            actingUserId: user.user_id,
          })
        }}
        onDecline={(relationId) => {
          if (!user?.user_id) return
          leaveRelationMutation.mutate({
            relationId,
            actingUserId: user.user_id,
          })
        }}
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
          if (!user?.user_id) return
          if (hasActiveTrainer || createRelationMutation.isPending) return
          createRelationMutation.mutate({
            acting_user_id: user.user_id,
            trainer_user_id: trainerUserId,
            client_user_id: user.user_id,
            mode: 'direct',
          })
        }}
      />
    </div>
  )
}
