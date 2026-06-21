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
  listClientsLookingForTrainerPaginated,
  listIncomingInvites,
  listTrainerClients,
  listTrainerClientsPaginated,
  listTrainers,
  queryKeys,
  upsertDiscoveryProfile,
} from '../api'
import type { CreateRelationRequest, UpsertDiscoveryProfileRequest } from '../types/relation'

function extractErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback
  return (error.response?.data as { detail?: string } | undefined)?.detail ?? fallback
}

type UseRelationsParams = {
  trainerUserId: string
  clientUserId: string
  status?: string
  trainerClientsPage?: {
    status?: string
    page: number
    pageSize: number
    search?: string
  }
  clientsLookingPage?: {
    page: number
    pageSize: number
    search?: string
  }
}

export function useRelations(params: UseRelationsParams) {
  const { trainerUserId, clientUserId, status = 'active', trainerClientsPage, clientsLookingPage } = params
  const queryClient = useQueryClient()
  const activeTrainerClientsPage = trainerClientsPage ?? { status: 'active', page: 1, pageSize: 8, search: '' }
  const activeClientsLookingPage = clientsLookingPage ?? { page: 1, pageSize: 8, search: '' }
  const trainerClientsSearch = activeTrainerClientsPage.search?.trim() ?? ''
  const clientsLookingSearch = activeClientsLookingPage.search?.trim() ?? ''

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

  const trainerClientsPaginatedQuery = useQuery({
    queryKey: queryKeys.relations.trainerClientsPaginated(
      trainerUserId,
      activeTrainerClientsPage.status ?? 'active',
      activeTrainerClientsPage.page,
      activeTrainerClientsPage.pageSize,
      trainerClientsSearch,
    ),
    queryFn: async () =>
      listTrainerClientsPaginated({
        trainerUserId,
        status: activeTrainerClientsPage.status,
        page: activeTrainerClientsPage.page,
        page_size: activeTrainerClientsPage.pageSize,
        search: trainerClientsSearch,
      }),
    enabled: Boolean(trainerUserId),
    retry: false,
  })

  const clientsLookingPaginatedQuery = useQuery({
    queryKey: queryKeys.relations.clientsLookingPaginated(
      activeClientsLookingPage.page,
      activeClientsLookingPage.pageSize,
      clientsLookingSearch,
    ),
    queryFn: async () =>
      listClientsLookingForTrainerPaginated({
        page: activeClientsLookingPage.page,
        page_size: activeClientsLookingPage.pageSize,
        search: clientsLookingSearch,
      }),
    enabled: Boolean(trainerUserId),
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

  const invalidateRelationLists = () => {
    void queryClient.invalidateQueries({
      queryKey: ['relations', 'trainer-clients'],
    })
    void queryClient.invalidateQueries({
      queryKey: ['relations', 'trainer-clients-paginated'],
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
      queryKey: ['relations', 'clients-looking-paginated'],
    })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.relations.incomingInvites(clientUserId),
    })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.relations.clientActiveRelation(clientUserId),
    })
  }

  const createRelationMutation = useMutation({
    mutationFn: async (payload: CreateRelationRequest) => createRelation(payload),
    onSuccess: () => {
      invalidateRelationLists()
      toast.success('Связь создана')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось создать связь')),
  })

  const upsertDiscoveryProfileMutation = useMutation({
    mutationFn: async (params: { userId: string; payload: UpsertDiscoveryProfileRequest }) =>
      upsertDiscoveryProfile(params.userId, params.payload),
    onSuccess: () => {
      invalidateRelationLists()
      toast.success('Профиль для поиска обновлен')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось обновить видимость профиля')),
  })

  const leaveRelationMutation = useMutation({
    mutationFn: async (params: { relationId: string; actingUserId: string }) =>
      leaveRelation(params.relationId, { acting_user_id: params.actingUserId }),
    onSuccess: () => {
      invalidateRelationLists()
      toast.success('Связь завершена')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось завершить связь')),
  })

  const acceptRelationMutation = useMutation({
    mutationFn: async (params: { relationId: string; actingUserId: string }) =>
      acceptRelation(params.relationId, { acting_user_id: params.actingUserId }),
    onSuccess: () => {
      invalidateRelationLists()
      toast.success('Приглашение принято')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось принять приглашение')),
  })

  return {
    trainerClientsQuery,
    trainerClientsPaginatedQuery,
    trainerFunnelQuery,
    trainerInvitesQuery,
    trainerDeclinedRelationsQuery,
    trainerEndedRelationsQuery,
    trainersQuery,
    clientsLookingQuery,
    clientsLookingPaginatedQuery,
    incomingInvitesQuery,
    clientActiveRelationQuery,
    createRelationMutation,
    acceptRelationMutation,
    upsertDiscoveryProfileMutation,
    leaveRelationMutation,
  }
}
