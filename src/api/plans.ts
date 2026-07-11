import { apiClient } from './client'
import type { ClientExerciseLoad, UpsertClientLoadRequest } from '../types/exercise'
import type { GeneratePlanRequest, TrainingPlan } from '../types/plan'

export async function generatePlan(payload: GeneratePlanRequest): Promise<TrainingPlan> {
  const { data } = await apiClient.post<TrainingPlan>('/api/v1/plans/generate', payload)
  return data
}

export async function getActivePlan(userId: string): Promise<TrainingPlan> {
  const { data } = await apiClient.get<TrainingPlan>(`/api/v1/plans/users/${encodeURIComponent(userId)}/active`)
  return data
}

export async function listClientLoads(clientUserId: string, trainerUserId: string): Promise<ClientExerciseLoad[]> {
  const { data } = await apiClient.get<ClientExerciseLoad[] | unknown>(
    `/api/v1/plans/clients/${encodeURIComponent(clientUserId)}/trainers/${encodeURIComponent(trainerUserId)}/loads`,
  )
  return Array.isArray(data) ? data : []
}

export async function upsertClientLoad(
  clientUserId: string,
  trainerUserId: string,
  exerciseRowId: string,
  payload: UpsertClientLoadRequest,
): Promise<ClientExerciseLoad> {
  const { data } = await apiClient.put<ClientExerciseLoad>(
    `/api/v1/plans/clients/${encodeURIComponent(clientUserId)}/trainers/${encodeURIComponent(trainerUserId)}/loads/${encodeURIComponent(exerciseRowId)}`,
    payload,
  )
  return data
}
