import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  acceptRelation,
  createRelation,
  getClientActiveRelation,
  getTrainerFunnel,
  leaveRelation,
  listClientsLookingForTrainer,
  listIncomingInvites,
  listTrainerClients,
  listTrainers,
  queryKeys,
  upsertDiscoveryProfile,
} from '../api'
import type { CreateRelationRequest, UpsertDiscoveryProfileRequest } from '../types/relation'

function extractErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback
  return (error.response?.data as { detail?: string } | undefined)?.detail ?? fallback
}

export function useRelations(params: { trainerUserId: string; clientUserId: string; status?: string }) {
  const { trainerUserId, clientUserId, status = 'active' } = params
  const queryClient = useQueryClient()

  const trainerClientsQuery = useQuery({
    queryKey: queryKeys.relations.trainerClients(trainerUserId, status),
    queryFn: async () => {
      const payload = await listTrainerClients(trainerUserId, status)
      return Array.isArray(payload) ? payload : []
    },
    enabled: Boolean(trainerUserId),
    retry: false,
  })

  const trainersQuery = useQuery({
    queryKey: queryKeys.relations.trainers,
    queryFn: async () => {
      const payload = await listTrainers()
      return Array.isArray(payload) ? payload : []
    },
    retry: false,
  })

  const clientsLookingQuery = useQuery({
    queryKey: queryKeys.relations.clientsLooking,
    queryFn: async () => {
      const payload = await listClientsLookingForTrainer()
      return Array.isArray(payload) ? payload : []
    },
    retry: false,
  })

  const incomingInvitesQuery = useQuery({
    queryKey: queryKeys.relations.incomingInvites(clientUserId),
    queryFn: async () => {
      const payload = await listIncomingInvites(clientUserId)
      return Array.isArray(payload) ? payload : []
    },
    enabled: Boolean(clientUserId),
    retry: false,
  })

  const clientActiveRelationQuery = useQuery({
    queryKey: queryKeys.relations.clientActiveRelation(clientUserId),
    queryFn: async () => getClientActiveRelation(clientUserId),
    enabled: Boolean(clientUserId),
    retry: false,
  })

  const trainerInvitesQuery = useQuery({
    queryKey: queryKeys.relations.trainerClients(trainerUserId, 'invited'),
    queryFn: async () => {
      const payload = await listTrainerClients(trainerUserId, 'invited')
      return Array.isArray(payload) ? payload : []
    },
    enabled: Boolean(trainerUserId),
    retry: false,
  })

  const trainerFunnelQuery = useQuery({
    queryKey: queryKeys.relations.trainerFunnel(trainerUserId),
    queryFn: async () => getTrainerFunnel(trainerUserId),
    enabled: Boolean(trainerUserId),
    retry: false,
  })

  const trainerDeclinedRelationsQuery = useQuery({
    queryKey: queryKeys.relations.trainerClients(trainerUserId, 'declined'),
    queryFn: async () => {
      const payload = await listTrainerClients(trainerUserId, 'declined')
      return Array.isArray(payload) ? payload : []
    },
    enabled: Boolean(trainerUserId),
    retry: false,
  })

  const trainerEndedRelationsQuery = useQuery({
    queryKey: queryKeys.relations.trainerClients(trainerUserId, 'ended'),
    queryFn: async () => {
      const payload = await listTrainerClients(trainerUserId, 'ended')
      return Array.isArray(payload) ? payload : []
    },
    enabled: Boolean(trainerUserId),
    retry: false,
  })

  const createRelationMutation = useMutation({
    mutationFn: async (payload: CreateRelationRequest) => createRelation(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.trainerClients(trainerUserId, 'active'),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.trainerClients(trainerUserId, 'invited'),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.trainerClients(trainerUserId, 'declined'),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.trainerClients(trainerUserId, 'ended'),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.trainerFunnel(trainerUserId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.trainers,
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.clientsLooking,
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.incomingInvites(clientUserId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.clientActiveRelation(clientUserId),
      })
      toast.success('Связь создана')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось создать связь')),
  })

  const upsertDiscoveryProfileMutation = useMutation({
    mutationFn: async (params: { userId: string; payload: UpsertDiscoveryProfileRequest }) =>
      upsertDiscoveryProfile(params.userId, params.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.trainers,
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.clientsLooking,
      })
      toast.success('Профиль для поиска обновлен')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось обновить видимость профиля')),
  })

  const leaveRelationMutation = useMutation({
    mutationFn: async (params: { relationId: string; actingUserId: string }) =>
      leaveRelation(params.relationId, { acting_user_id: params.actingUserId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.trainerClients(trainerUserId, 'active'),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.trainerClients(trainerUserId, 'invited'),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.trainerClients(trainerUserId, 'declined'),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.trainerClients(trainerUserId, 'ended'),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.trainerFunnel(trainerUserId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.trainers,
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.clientsLooking,
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.incomingInvites(clientUserId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.clientActiveRelation(clientUserId),
      })
      toast.success('Связь завершена')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось завершить связь')),
  })

  const acceptRelationMutation = useMutation({
    mutationFn: async (params: { relationId: string; actingUserId: string }) =>
      acceptRelation(params.relationId, { acting_user_id: params.actingUserId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.trainerClients(trainerUserId, 'active'),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.trainerClients(trainerUserId, 'invited'),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.trainerClients(trainerUserId, 'declined'),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.trainerClients(trainerUserId, 'ended'),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.trainerFunnel(trainerUserId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.clientsLooking,
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.incomingInvites(clientUserId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.clientActiveRelation(clientUserId),
      })
      toast.success('Приглашение принято')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось принять приглашение')),
  })

  return {
    trainerClientsQuery,
    trainerFunnelQuery,
    trainerInvitesQuery,
    trainerDeclinedRelationsQuery,
    trainerEndedRelationsQuery,
    trainersQuery,
    clientsLookingQuery,
    incomingInvitesQuery,
    clientActiveRelationQuery,
    createRelationMutation,
    acceptRelationMutation,
    upsertDiscoveryProfileMutation,
    leaveRelationMutation,
  }
}
