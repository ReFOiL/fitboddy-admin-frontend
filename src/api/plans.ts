import { apiClient } from './client'
import type { ClientExerciseLoad, UpsertClientLoadRequest } from '../types/exercise'
import type { GeneratePlanRequest, TodayWorkout, TrainingPlan } from '../types/plan'

export async function generatePlan(payload: GeneratePlanRequest): Promise<TrainingPlan> {
  const { data } = await apiClient.post<TrainingPlan>('/api/v1/plans/generate', payload)
  return data
}

export async function getActivePlan(userId: string): Promise<TrainingPlan> {
  const { data } = await apiClient.get<TrainingPlan>(`/api/v1/plans/users/${encodeURIComponent(userId)}/active`)
  return data
}

export async function getTodayWorkout(): Promise<TodayWorkout> {
  const { data } = await apiClient.get<TodayWorkout>('/api/v1/plans/me/today')
  return data
}

export async function completePlanDay(dayIndex: number): Promise<TodayWorkout> {
  const { data } = await apiClient.post<TodayWorkout>(`/api/v1/plans/me/days/${dayIndex}/complete`)
  return data
}

export async function replacePlanExercise(dayIndex: number, lineId: string): Promise<TodayWorkout> {
  const { data } = await apiClient.post<TodayWorkout>(
    `/api/v1/plans/me/days/${dayIndex}/exercises/${encodeURIComponent(lineId)}/replace`,
  )
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

export async function listClientPlatformLoads(clientUserId: string): Promise<ClientExerciseLoad[]> {
  const { data } = await apiClient.get<ClientExerciseLoad[] | unknown>(
    `/api/v1/plans/clients/${encodeURIComponent(clientUserId)}/platform/loads`,
  )
  return Array.isArray(data) ? data : []
}

export async function upsertClientPlatformLoad(
  clientUserId: string,
  exerciseRowId: string,
  payload: UpsertClientLoadRequest,
): Promise<ClientExerciseLoad> {
  const { data } = await apiClient.put<ClientExerciseLoad>(
    `/api/v1/plans/clients/${encodeURIComponent(clientUserId)}/platform/loads/${encodeURIComponent(exerciseRowId)}`,
    payload,
  )
  return data
}
