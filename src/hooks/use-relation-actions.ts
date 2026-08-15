import { useCallback } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'

import type { CreateRelationRequest, UpsertDiscoveryProfileRequest } from '../types/relation'

type WithUserIdHandler = (action: (resolvedUserId: string) => void) => void

type MutationLike<TVariables> = UseMutationResult<unknown, unknown, TVariables, unknown>

type UseClientRelationActionsParams = {
  withUserId: WithUserIdHandler
  acceptRelationMutation: MutationLike<{ relationId: string }>
  leaveRelationMutation: MutationLike<{ relationId: string }>
  createRelationMutation: MutationLike<CreateRelationRequest>
}

type UseTrainerRelationActionsParams = {
  withUserId: WithUserIdHandler
  upsertDiscoveryProfileMutation: MutationLike<{ userId: string; payload: UpsertDiscoveryProfileRequest }>
  leaveRelationMutation: MutationLike<{ relationId: string }>
}

export function useClientRelationActions(params: UseClientRelationActionsParams) {
  const { withUserId, acceptRelationMutation, leaveRelationMutation, createRelationMutation } = params

  const acceptInvite = useCallback(
    (relationId: string) => {
      acceptRelationMutation.mutate({ relationId })
    },
    [acceptRelationMutation],
  )

  const declineInvite = useCallback(
    (relationId: string) => {
      leaveRelationMutation.mutate({ relationId })
    },
    [leaveRelationMutation],
  )

  const connectTrainer = useCallback(
    (trainerUserId: string) => {
      withUserId((clientUserId) => {
        createRelationMutation.mutate({
          trainer_user_id: trainerUserId,
          client_user_id: clientUserId,
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
      leaveRelationMutation.mutate({ relationId })
    },
    [leaveRelationMutation],
  )

  return {
    togglePublication,
    leaveClientRelation,
  }
}
