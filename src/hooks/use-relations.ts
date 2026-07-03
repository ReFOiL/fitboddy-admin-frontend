import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  acceptRelation,
  createRelation,
  getClientActiveRelation,
  getTrainerFunnel,
  getTrainerPublicationStatus,
  leaveRelation,
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
}

type UseTrainerRelationsParams = {
  trainerUserId: string
  status?: string
  trainerClientsPage?: {
    status?: string
    page: number
    pageSize: number
    search?: string
  }
}

type UseClientRelationsParams = {
  clientUserId: string
}

type RelationsCoreParams = UseRelationsParams & {
  enableTrainerQueries: boolean
  enableClientQueries: boolean
}

function invalidateRelationLists(params: {
  queryClient: ReturnType<typeof useQueryClient>
  trainerUserId: string
  clientUserId: string
}) {
  const { queryClient, trainerUserId, clientUserId } = params

  void queryClient.invalidateQueries({ queryKey: ['relations', 'trainer-clients'] })
  void queryClient.invalidateQueries({ queryKey: ['relations', 'trainer-clients-paginated'] })
  void queryClient.invalidateQueries({ queryKey: queryKeys.relations.trainers })

  if (trainerUserId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.relations.trainerFunnel(trainerUserId),
    })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.relations.trainerPublicationStatus(trainerUserId),
    })
  }

  if (clientUserId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.relations.incomingInvites(clientUserId),
    })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.relations.clientActiveRelation(clientUserId),
    })
  }
}

function useRelationsCore(params: RelationsCoreParams) {
  const {
    trainerUserId,
    clientUserId,
    status = 'active',
    trainerClientsPage,
    enableTrainerQueries,
    enableClientQueries,
  } = params
  const queryClient = useQueryClient()
  const activeTrainerClientsPage = trainerClientsPage ?? { status: 'active', page: 1, pageSize: 8, search: '' }
  const trainerClientsSearch = activeTrainerClientsPage.search?.trim() ?? ''

  const trainerClientsQuery = useQuery({
    queryKey: queryKeys.relations.trainerClients(trainerUserId, status),
    queryFn: async () => {
      const payload = await listTrainerClients(trainerUserId, status)
      return Array.isArray(payload) ? payload : []
    },
    enabled: enableTrainerQueries && Boolean(trainerUserId),
    retry: false,
  })

  const trainersQuery = useQuery({
    queryKey: queryKeys.relations.trainers,
    queryFn: async () => {
      const payload = await listTrainers()
      return Array.isArray(payload) ? payload : []
    },
    enabled: enableClientQueries,
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
    enabled: enableTrainerQueries && Boolean(trainerUserId),
    retry: false,
  })

  const incomingInvitesQuery = useQuery({
    queryKey: queryKeys.relations.incomingInvites(clientUserId),
    queryFn: async () => {
      const payload = await listIncomingInvites(clientUserId)
      return Array.isArray(payload) ? payload : []
    },
    enabled: enableClientQueries && Boolean(clientUserId),
    retry: false,
  })

  const clientActiveRelationQuery = useQuery({
    queryKey: queryKeys.relations.clientActiveRelation(clientUserId),
    queryFn: async () => getClientActiveRelation(clientUserId),
    enabled: enableClientQueries && Boolean(clientUserId),
    retry: false,
  })

  const trainerFunnelQuery = useQuery({
    queryKey: queryKeys.relations.trainerFunnel(trainerUserId),
    queryFn: async () => getTrainerFunnel(trainerUserId),
    enabled: enableTrainerQueries && Boolean(trainerUserId),
    retry: false,
  })

  const trainerPublicationStatusQuery = useQuery({
    queryKey: queryKeys.relations.trainerPublicationStatus(trainerUserId),
    queryFn: async () => getTrainerPublicationStatus(trainerUserId),
    enabled: enableTrainerQueries && Boolean(trainerUserId),
    retry: false,
  })

  const invalidateDiscoveryVisibility = (params: { userId: string; payload: UpsertDiscoveryProfileRequest }) => {
    if (params.payload.role === 'trainer') {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.relations.trainers,
      })
      return
    }
  }

  const createRelationMutation = useMutation({
    mutationFn: async (payload: CreateRelationRequest) => createRelation(payload),
    onSuccess: () => {
      invalidateRelationLists({ queryClient, trainerUserId, clientUserId })
      toast.success('Связь создана')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось создать связь')),
  })

  const upsertDiscoveryProfileMutation = useMutation({
    mutationFn: async (params: { userId: string; payload: UpsertDiscoveryProfileRequest }) =>
      upsertDiscoveryProfile(params.userId, params.payload),
    onSuccess: (data, params) => {
      if (data.role === 'trainer') {
        queryClient.setQueryData(queryKeys.relations.trainerPublicationStatus(params.userId), {
          trainer_user_id: params.userId,
          is_published: params.payload.is_visible,
        })
      }
      invalidateDiscoveryVisibility(params)
      toast.success('Профиль для поиска обновлен')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось обновить видимость профиля')),
  })

  const leaveRelationMutation = useMutation({
    mutationFn: async (params: { relationId: string; actingUserId: string }) =>
      leaveRelation(params.relationId, { acting_user_id: params.actingUserId }),
    onSuccess: () => {
      invalidateRelationLists({ queryClient, trainerUserId, clientUserId })
      toast.success('Связь завершена')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось завершить связь')),
  })

  const acceptRelationMutation = useMutation({
    mutationFn: async (params: { relationId: string; actingUserId: string }) =>
      acceptRelation(params.relationId, { acting_user_id: params.actingUserId }),
    onSuccess: () => {
      invalidateRelationLists({ queryClient, trainerUserId, clientUserId })
      toast.success('Приглашение принято')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось принять приглашение')),
  })

  return {
    trainerClientsQuery,
    trainerClientsPaginatedQuery,
    trainerFunnelQuery,
    trainerPublicationStatusQuery,
    trainersQuery,
    incomingInvitesQuery,
    clientActiveRelationQuery,
    createRelationMutation,
    acceptRelationMutation,
    upsertDiscoveryProfileMutation,
    leaveRelationMutation,
  }
}

export function useTrainerRelations(params: UseTrainerRelationsParams) {
  const { trainerUserId, status, trainerClientsPage } = params
  return useRelationsCore({
    trainerUserId,
    clientUserId: '',
    status,
    trainerClientsPage,
    enableTrainerQueries: true,
    enableClientQueries: false,
  })
}

export function useClientRelations(params: UseClientRelationsParams) {
  const { clientUserId } = params
  return useRelationsCore({
    trainerUserId: '',
    clientUserId,
    enableTrainerQueries: false,
    enableClientQueries: true,
  })
}

export function useRelations(params: UseRelationsParams) {
  return useRelationsCore({
    ...params,
    enableTrainerQueries: true,
    enableClientQueries: true,
  })
}
