import type {
  AddPlanSlotRequest,
  CreateEmptyPlanRequest,
  PlanDay,
  ReorderPlanSlotsRequest,
  ReplaceDaySlotsRequest,
  TrainingPlan,
  UpdatePlanSlotRequest,
} from '../types/plan'
import { apiClient } from './client'

/**
 * Trainer manual plan editor.
 *
 * Prefix: `/api/v1/plans/clients/{client_user_id}/trainers/{trainer_user_id}`
 * `exercise_id` is trainer_exercises.row_id.
 *
 * GET and POST `/active` return the training plan. Day writes return that day,
 * and delete returns 204, so the editor refetches GET `/active` after a save.
 * POST `/active` creates an empty plan and conflicts when one is already active.
 * Replacing an existing plan stays on POST `/api/v1/plans/generate`.
 */
function trainerPlanBase(clientUserId: string, trainerUserId: string): string {
  return `/api/v1/plans/clients/${encodeURIComponent(clientUserId)}/trainers/${encodeURIComponent(trainerUserId)}`
}

export const planEditorPaths = {
  active: (clientUserId: string, trainerUserId: string) =>
    `${trainerPlanBase(clientUserId, trainerUserId)}/active`,
  replaceDay: (clientUserId: string, trainerUserId: string, dayIndex: number) =>
    `${trainerPlanBase(clientUserId, trainerUserId)}/days/${dayIndex}`,
  addExercise: (clientUserId: string, trainerUserId: string, dayIndex: number) =>
    `${trainerPlanBase(clientUserId, trainerUserId)}/days/${dayIndex}/exercises`,
  updateExercise: (clientUserId: string, trainerUserId: string, dayIndex: number, lineId: string) =>
    `${trainerPlanBase(clientUserId, trainerUserId)}/days/${dayIndex}/exercises/${encodeURIComponent(lineId)}`,
  deleteExercise: (clientUserId: string, trainerUserId: string, dayIndex: number, lineId: string) =>
    `${trainerPlanBase(clientUserId, trainerUserId)}/days/${dayIndex}/exercises/${encodeURIComponent(lineId)}`,
  reorderExercises: (clientUserId: string, trainerUserId: string, dayIndex: number) =>
    `${trainerPlanBase(clientUserId, trainerUserId)}/days/${dayIndex}/exercises/order`,
}

export async function getTrainerClientPlan(clientUserId: string, trainerUserId: string): Promise<TrainingPlan> {
  const { data } = await apiClient.get<TrainingPlan>(planEditorPaths.active(clientUserId, trainerUserId))
  return data
}

export async function createEmptyPlan(
  clientUserId: string,
  trainerUserId: string,
  payload: CreateEmptyPlanRequest,
): Promise<TrainingPlan> {
  const { data } = await apiClient.post<TrainingPlan>(
    planEditorPaths.active(clientUserId, trainerUserId),
    payload,
  )
  return data
}

export async function replaceDaySlots(
  clientUserId: string,
  trainerUserId: string,
  dayIndex: number,
  payload: ReplaceDaySlotsRequest,
): Promise<PlanDay> {
  const { data } = await apiClient.put<PlanDay>(
    planEditorPaths.replaceDay(clientUserId, trainerUserId, dayIndex),
    payload,
  )
  return data
}

export async function addPlanSlot(
  clientUserId: string,
  trainerUserId: string,
  dayIndex: number,
  payload: AddPlanSlotRequest,
): Promise<PlanDay> {
  const { data } = await apiClient.post<PlanDay>(
    planEditorPaths.addExercise(clientUserId, trainerUserId, dayIndex),
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
): Promise<PlanDay> {
  const { data } = await apiClient.patch<PlanDay>(
    planEditorPaths.updateExercise(clientUserId, trainerUserId, dayIndex, lineId),
    payload,
  )
  return data
}

export async function deletePlanSlot(
  clientUserId: string,
  trainerUserId: string,
  dayIndex: number,
  lineId: string,
): Promise<void> {
  await apiClient.delete(planEditorPaths.deleteExercise(clientUserId, trainerUserId, dayIndex, lineId))
}

export async function reorderPlanSlots(
  clientUserId: string,
  trainerUserId: string,
  dayIndex: number,
  payload: ReorderPlanSlotsRequest,
): Promise<PlanDay> {
  const { data } = await apiClient.put<PlanDay>(
    planEditorPaths.reorderExercises(clientUserId, trainerUserId, dayIndex),
    payload,
  )
  return data
}
