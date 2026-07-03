import { useCallback } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'

import type { CreateRelationRequest, UpsertDiscoveryProfileRequest } from '../types/relation'

type WithUserIdHandler = (action: (resolvedUserId: string) => void) => void

type MutationLike<TVariables> = UseMutationResult<unknown, unknown, TVariables, unknown>

type UseClientRelationActionsParams = {
  withUserId: WithUserIdHandler
  acceptRelationMutation: MutationLike<{ relationId: string; actingUserId: string }>
  leaveRelationMutation: MutationLike<{ relationId: string; actingUserId: string }>
  createRelationMutation: MutationLike<CreateRelationRequest>
}

type UseTrainerRelationActionsParams = {
  withUserId: WithUserIdHandler
  upsertDiscoveryProfileMutation: MutationLike<{ userId: string; payload: UpsertDiscoveryProfileRequest }>
  leaveRelationMutation: MutationLike<{ relationId: string; actingUserId: string }>
}

export function useClientRelationActions(params: UseClientRelationActionsParams) {
  const { withUserId, acceptRelationMutation, leaveRelationMutation, createRelationMutation } = params

  const acceptInvite = useCallback(
    (relationId: string) => {
      withUserId((actingUserId) => {
        acceptRelationMutation.mutate({
          relationId,
          actingUserId,
        })
      })
    },
    [acceptRelationMutation, withUserId],
  )

  const declineInvite = useCallback(
    (relationId: string) => {
      withUserId((actingUserId) => {
        leaveRelationMutation.mutate({
          relationId,
          actingUserId,
        })
      })
    },
    [leaveRelationMutation, withUserId],
  )

  const connectTrainer = useCallback(
    (trainerUserId: string) => {
      withUserId((actingUserId) => {
        createRelationMutation.mutate({
          acting_user_id: actingUserId,
          trainer_user_id: trainerUserId,
          client_user_id: actingUserId,
          mode: 'direct',
        })
      })
    },
    [createRelationMutation, withUserId],
  )

  return {
    acceptInvite,
    declineInvite,
    connectTrainer,
  }
}

export function useTrainerRelationActions(params: UseTrainerRelationActionsParams) {
  const { withUserId, upsertDiscoveryProfileMutation, leaveRelationMutation } = params

  const togglePublication = useCallback(
    (isVisible: boolean) => {
      withUserId((resolvedUserId) => {
        upsertDiscoveryProfileMutation.mutate({
          userId: resolvedUserId,
          payload: {
            role: 'trainer',
            is_visible: isVisible,
          },
        })
      })
    },
    [upsertDiscoveryProfileMutation, withUserId],
  )

  const leaveClientRelation = useCallback(
    (relationId: string) => {
      withUserId((actingUserId) => {
        leaveRelationMutation.mutate({
          relationId,
          actingUserId,
        })
      })
    },
    [leaveRelationMutation, withUserId],
  )

  return {
    togglePublication,
    leaveClientRelation,
  }
}
