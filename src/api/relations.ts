import { apiClient } from './client'
import type {
  CreateRelationRequest,
  DiscoveryProfile,
  RelationActionRequest,
  TrainerClientRelation,
  TrainerFunnelMetrics,
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

export async function listTrainers(): Promise<DiscoveryProfile[]> {
  const { data } = await apiClient.get<DiscoveryProfile[]>('/api/v1/marketplace/trainers')
  return Array.isArray(data) ? data : []
}

export async function listClientsLookingForTrainer(): Promise<DiscoveryProfile[]> {
  const { data } = await apiClient.get<DiscoveryProfile[]>('/api/v1/marketplace/clients/looking')
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
