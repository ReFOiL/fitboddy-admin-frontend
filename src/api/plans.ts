import { apiClient } from './client'
import type { GeneratePlanRequest, TrainingPlan } from '../types/plan'

export async function generatePlan(payload: GeneratePlanRequest): Promise<TrainingPlan> {
  const { data } = await apiClient.post<TrainingPlan>('/api/v1/plans/generate', payload)
  return data
}

export async function getActivePlan(userId: string): Promise<TrainingPlan> {
  const { data } = await apiClient.get<TrainingPlan>(`/api/v1/plans/users/${encodeURIComponent(userId)}/active`)
  return data
}
