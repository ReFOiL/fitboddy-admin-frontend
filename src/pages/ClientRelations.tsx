import { useProfile } from '../hooks/use-profile'
import { useRelations } from '../hooks/use-relations'
import { useUserIdGuard } from '../hooks/use-user-id-guard'
import { ClientProfileRequiredCard } from '../components/client-relations/ClientProfileRequiredCard'
import { IncomingInvitesCard } from '../components/client-relations/IncomingInvitesCard'
import { TrainerSelectionCard } from '../components/client-relations/TrainerSelectionCard'
import { isProfileCompleted } from '../lib/profile-completion'

export function ClientRelationsPage() {
  const { user, userId, withUserId } = useUserIdGuard()
  const clientUserId = user?.role === 'client' ? userId : ''
  const { trainersQuery, incomingInvitesQuery, clientActiveRelationQuery, createRelationMutation, acceptRelationMutation, leaveRelationMutation } =
    useRelations({
      trainerUserId: '',
      clientUserId,
    })

  const trainers = Array.isArray(trainersQuery.data) ? trainersQuery.data : []
  const incomingInvites = Array.isArray(incomingInvitesQuery.data) ? incomingInvitesQuery.data : []
  const { profileQuery } = useProfile(userId)
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
          withUserId((actingUserId) => {
            acceptRelationMutation.mutate({
              relationId,
              actingUserId,
            })
          })
        }}
        onDecline={(relationId) => {
          withUserId((actingUserId) => {
            leaveRelationMutation.mutate({
              relationId,
              actingUserId,
            })
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
          if (hasActiveTrainer || createRelationMutation.isPending) return
          withUserId((actingUserId) => {
            createRelationMutation.mutate({
              acting_user_id: actingUserId,
              trainer_user_id: trainerUserId,
              client_user_id: actingUserId,
              mode: 'direct',
            })
          })
        }}
      />
    </div>
  )
}
