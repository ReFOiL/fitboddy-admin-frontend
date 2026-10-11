import type {
  AddPlanSlotRequest,
  CreateManualPlanRequest,
  ReorderPlanSlotsRequest,
  ReplaceDaySlotsRequest,
  TrainingPlan,
  UpdatePlanSlotRequest,
} from '../types/plan'
import { apiClient } from './client'

/**
 * Trainer manual plan editor.
 *
 * GET stays on the existing active-plan route. Slots are `days[].exercises`,
 * ordered by `sort_order`. `exercise_id` is the catalog row id.
 *
 * Mutation paths are the only place to retarget if fitboddy-plan-service
 * lands a different CRUD shape. Each call expects the updated TrainingPlan.
 *
 * Save in the editor uses replace-day (one request per changed day) and
 * create-manual for a plan that does not exist yet. Add, update, delete, and
 * reorder are available for callers that want per-slot writes.
 */
export const planEditorPaths = {
  replaceDaySlots: (clientUserId: string, trainerUserId: string, dayIndex: number) =>
    `/api/v1/plans/clients/${encodeURIComponent(clientUserId)}/trainers/${encodeURIComponent(trainerUserId)}/days/${dayIndex}/slots`,
  addSlot: (clientUserId: string, trainerUserId: string, dayIndex: number) =>
    `/api/v1/plans/clients/${encodeURIComponent(clientUserId)}/trainers/${encodeURIComponent(trainerUserId)}/days/${dayIndex}/slots`,
  updateSlot: (clientUserId: string, trainerUserId: string, dayIndex: number, lineId: string) =>
    `/api/v1/plans/clients/${encodeURIComponent(clientUserId)}/trainers/${encodeURIComponent(trainerUserId)}/days/${dayIndex}/slots/${encodeURIComponent(lineId)}`,
  deleteSlot: (clientUserId: string, trainerUserId: string, dayIndex: number, lineId: string) =>
    `/api/v1/plans/clients/${encodeURIComponent(clientUserId)}/trainers/${encodeURIComponent(trainerUserId)}/days/${dayIndex}/slots/${encodeURIComponent(lineId)}`,
  reorderSlots: (clientUserId: string, trainerUserId: string, dayIndex: number) =>
    `/api/v1/plans/clients/${encodeURIComponent(clientUserId)}/trainers/${encodeURIComponent(trainerUserId)}/days/${dayIndex}/slots/order`,
  createManualPlan: (clientUserId: string, trainerUserId: string) =>
    `/api/v1/plans/clients/${encodeURIComponent(clientUserId)}/trainers/${encodeURIComponent(trainerUserId)}/manual`,
}

export async function replaceDaySlots(
  clientUserId: string,
  trainerUserId: string,
  dayIndex: number,
  payload: ReplaceDaySlotsRequest,
): Promise<TrainingPlan> {
  const { data } = await apiClient.put<TrainingPlan>(
    planEditorPaths.replaceDaySlots(clientUserId, trainerUserId, dayIndex),
    payload,
  )
  return data
}

export async function addPlanSlot(
  clientUserId: string,
  trainerUserId: string,
  dayIndex: number,
  payload: AddPlanSlotRequest,
): Promise<TrainingPlan> {
  const { data } = await apiClient.post<TrainingPlan>(
    planEditorPaths.addSlot(clientUserId, trainerUserId, dayIndex),
    payload,
  )
  return data
}

export async function updatePlanSlot(
  clientUserId: string,
  trainerUserId: string,
  dayIndex: number,
  lineId: string,
  payload: UpdatePlanSlotRequest,
): Promise<TrainingPlan> {
  const { data } = await apiClient.patch<TrainingPlan>(
    planEditorPaths.updateSlot(clientUserId, trainerUserId, dayIndex, lineId),
    payload,
  )
  return data
}

export async function deletePlanSlot(
  clientUserId: string,
  trainerUserId: string,
  dayIndex: number,
  lineId: string,
): Promise<TrainingPlan> {
  const { data } = await apiClient.delete<TrainingPlan>(
    planEditorPaths.deleteSlot(clientUserId, trainerUserId, dayIndex, lineId),
  )
  return data
}

export async function reorderPlanSlots(
  clientUserId: string,
  trainerUserId: string,
  dayIndex: number,
  payload: ReorderPlanSlotsRequest,
): Promise<TrainingPlan> {
  const { data } = await apiClient.put<TrainingPlan>(
    planEditorPaths.reorderSlots(clientUserId, trainerUserId, dayIndex),
    payload,
  )
  return data
}

export async function createManualPlan(
  clientUserId: string,
  trainerUserId: string,
  payload: CreateManualPlanRequest,
): Promise<TrainingPlan> {
  const { data } = await apiClient.post<TrainingPlan>(
    planEditorPaths.createManualPlan(clientUserId, trainerUserId),
    payload,
  )
  return data
}
