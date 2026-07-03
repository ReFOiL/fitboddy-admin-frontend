import { apiClient } from './client'
import type {
  CreateRelationRequest,
  DiscoveryProfile,
  PaginatedResult,
  RelationActionRequest,
  TrainerClientRelation,
  TrainerFunnelMetrics,
  TrainerPublicationStatus,
  UpsertDiscoveryProfileRequest,
} from '../types/relation'

export async function createRelation(payload: CreateRelationRequest): Promise<TrainerClientRelation> {
  const { data } = await apiClient.post<TrainerClientRelation>('/api/v1/marketplace/relations', payload)
  return data
}

export async function acceptRelation(
  relationId: string,
  payload: RelationActionRequest,
): Promise<TrainerClientRelation> {
  const { data } = await apiClient.post<TrainerClientRelation>(
    `/api/v1/marketplace/relations/${encodeURIComponent(relationId)}/accept`,
    payload,
  )
  return data
}

export async function leaveRelation(
  relationId: string,
  payload: RelationActionRequest,
): Promise<TrainerClientRelation> {
  const { data } = await apiClient.post<TrainerClientRelation>(
    `/api/v1/marketplace/relations/${encodeURIComponent(relationId)}/leave`,
    payload,
  )
  return data
}

export async function listTrainerClients(trainerUserId: string, status = 'active'): Promise<TrainerClientRelation[]> {
  const { data } = await apiClient.get<TrainerClientRelation[]>(
    `/api/v1/marketplace/trainers/${encodeURIComponent(trainerUserId)}/clients`,
    {
      params: { status },
    },
  )
  return Array.isArray(data) ? data : []
}

export async function listTrainerClientsPaginated(params: {
  trainerUserId: string
  status?: string
  page: number
  page_size: number
  search?: string
}): Promise<PaginatedResult<TrainerClientRelation>> {
  const { trainerUserId, page, page_size, search, status = 'active' } = params
  const response = await apiClient.get<TrainerClientRelation[]>(
    `/api/v1/marketplace/trainers/${encodeURIComponent(trainerUserId)}/clients`,
    {
      params: {
        status,
        page,
        page_size,
        search: search?.trim() ? search.trim() : undefined,
      },
    },
  )
  const items = Array.isArray(response.data) ? response.data : []
  const totalHeader = Number(response.headers['x-total-count'])
  const total = Number.isFinite(totalHeader) ? totalHeader : items.length
  return {
    items,
    total,
    page,
    page_size,
    total_pages: Math.max(1, Math.ceil(total / page_size)),
  }
}

export async function listIncomingInvites(clientUserId: string): Promise<TrainerClientRelation[]> {
  const { data } = await apiClient.get<TrainerClientRelation[]>(
    `/api/v1/marketplace/clients/${encodeURIComponent(clientUserId)}/invites`,
  )
  return Array.isArray(data) ? data : []
}

export async function getClientActiveRelation(clientUserId: string): Promise<TrainerClientRelation> {
  const { data } = await apiClient.get<TrainerClientRelation>(
    `/api/v1/marketplace/clients/${encodeURIComponent(clientUserId)}/active-relation`,
  )
  return data
}

export async function getTrainerFunnel(trainerUserId: string): Promise<TrainerFunnelMetrics> {
  const { data } = await apiClient.get<TrainerFunnelMetrics>(
    `/api/v1/marketplace/trainers/${encodeURIComponent(trainerUserId)}/funnel`,
  )
  return data
}

export async function getTrainerPublicationStatus(trainerUserId: string): Promise<TrainerPublicationStatus> {
  const { data } = await apiClient.get<TrainerPublicationStatus>(
    `/api/v1/marketplace/trainers/${encodeURIComponent(trainerUserId)}/publication-status`,
  )
  return data
}

export async function listTrainers(): Promise<DiscoveryProfile[]> {
  const { data } = await apiClient.get<DiscoveryProfile[]>('/api/v1/marketplace/trainers')
  return Array.isArray(data) ? data : []
}

export async function upsertDiscoveryProfile(
  userId: string,
  payload: UpsertDiscoveryProfileRequest,
): Promise<DiscoveryProfile> {
  const { data } = await apiClient.put<DiscoveryProfile>(
    `/api/v1/marketplace/users/${encodeURIComponent(userId)}/profile`,
    payload,
  )
  return data
}
