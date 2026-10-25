import axios from 'axios'
import { apiClient } from './client'
import type {
  CreateRelationRequest,
  DiscoveryProfile,
  PaginatedResult,
  PublicInvite,
  TrainerClientRelation,
  TrainerFunnelMetrics,
  TrainerInviteLink,
  TrainerPublicationStatus,
  UpsertDiscoveryProfileRequest,
} from '../types/relation'

export async function createRelation(payload: CreateRelationRequest): Promise<TrainerClientRelation> {
  const { data } = await apiClient.post<TrainerClientRelation>('/api/v1/marketplace/relations', payload)
  return data
}

export async function acceptRelation(relationId: string): Promise<TrainerClientRelation> {
  const { data } = await apiClient.post<TrainerClientRelation>(
    `/api/v1/marketplace/relations/${encodeURIComponent(relationId)}/accept`,
  )
  return data
}

export async function leaveRelation(relationId: string): Promise<TrainerClientRelation> {
  const { data } = await apiClient.post<TrainerClientRelation>(
    `/api/v1/marketplace/relations/${encodeURIComponent(relationId)}/leave`,
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

export async function getClientActiveRelation(clientUserId: string): Promise<TrainerClientRelation | null> {
  try {
    const { data } = await apiClient.get<TrainerClientRelation>(
      `/api/v1/marketplace/clients/${encodeURIComponent(clientUserId)}/active-relation`,
    )
    return data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null
    }
    throw error
  }
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

export async function getMyInviteLink(): Promise<TrainerInviteLink> {
  const { data } = await apiClient.get<TrainerInviteLink>('/api/v1/marketplace/trainers/me/invite-link')
  return data
}

export async function rotateMyInviteLink(): Promise<TrainerInviteLink> {
  const { data } = await apiClient.post<TrainerInviteLink>('/api/v1/marketplace/trainers/me/invite-link/rotate', {})
  return data
}

// Публичная карточка тренера. Токен не шлём: протухший Bearer на шлюзе дал бы 401 и увёл бы гостя со страницы.
export async function getPublicInvite(code: string): Promise<PublicInvite> {
  const { data } = await apiClient.get<PublicInvite>(`/api/v1/marketplace/invite/${encodeURIComponent(code)}`, {
    skipAuth: true,
    skipAuthRedirect: true,
  })
  return data
}

export async function acceptInviteCode(code: string, force = false): Promise<TrainerClientRelation> {
  const { data } = await apiClient.post<TrainerClientRelation>(
    `/api/v1/marketplace/invite/${encodeURIComponent(code)}/accept`,
    {},
    force ? { params: { force: true } } : undefined,
  )
  return data
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
