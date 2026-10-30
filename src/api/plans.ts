import { apiClient } from './client'
import type { ClientExerciseLoad, UpsertClientLoadRequest } from '../types/exercise'
import type { GenerationPolicy } from '../types/generation-policy'
import type {
  AddPlanDayRequest,
  ChangePlanDayWeekdayRequest,
  ChangePlanDayWeekdayResponse,
  CopyPlanDayRequest,
  CopyPlanWeekRequest,
  CreateEmptyPlanRequest,
  GeneratePlanRequest,
  PlanDay,
  PlanSlotWrite,
  SetPlanStartRequest,
  TodayWorkout,
  TrainingPlan,
} from '../types/plan'

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

export async function completePlanDay(dayIndex: number, startedAt?: string | null): Promise<TodayWorkout> {
  const { data } = await apiClient.post<TodayWorkout>(`/api/v1/plans/me/days/${dayIndex}/complete`, startedAt ? { started_at: startedAt } : {})
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

export async function getTrainerClientPlan(clientUserId: string, trainerUserId: string): Promise<TrainingPlan> {
  const { data } = await apiClient.get<TrainingPlan>(
    `/api/v1/plans/clients/${encodeURIComponent(clientUserId)}/trainers/${encodeURIComponent(trainerUserId)}/active`,
  )
  return data
}

export async function createEmptyPlan(
  clientUserId: string,
  trainerUserId: string,
  payload: CreateEmptyPlanRequest,
): Promise<TrainingPlan> {
  const { data } = await apiClient.post<TrainingPlan>(
    `/api/v1/plans/clients/${encodeURIComponent(clientUserId)}/trainers/${encodeURIComponent(trainerUserId)}/active`,
    payload,
  )
  return data
}

function trainerPlanRoot(clientUserId: string, trainerUserId: string): string {
  return `/api/v1/plans/clients/${encodeURIComponent(clientUserId)}/trainers/${encodeURIComponent(trainerUserId)}`
}

export async function addPlanDay(clientUserId: string, trainerUserId: string, payload: AddPlanDayRequest): Promise<TrainingPlan> {
  const { data } = await apiClient.post<TrainingPlan>(`${trainerPlanRoot(clientUserId, trainerUserId)}/days`, payload)
  return data
}

export async function deletePlanDay(clientUserId: string, trainerUserId: string, dayIndex: number): Promise<TrainingPlan> {
  const { data } = await apiClient.delete<TrainingPlan>(`${trainerPlanRoot(clientUserId, trainerUserId)}/days/${dayIndex}`)
  return data
}

export async function patchPlanDayTime(
  clientUserId: string,
  trainerUserId: string,
  dayIndex: number,
  scheduledTime: string | null,
): Promise<PlanDay> {
  const { data } = await apiClient.patch<PlanDay>(`${trainerPlanRoot(clientUserId, trainerUserId)}/days/${dayIndex}`, {
    scheduled_time: scheduledTime,
  })
  return data
}

export async function copyPlanDay(
  clientUserId: string,
  trainerUserId: string,
  dayIndex: number,
  payload: CopyPlanDayRequest,
): Promise<TrainingPlan> {
  const { data } = await apiClient.post<TrainingPlan>(
    `${trainerPlanRoot(clientUserId, trainerUserId)}/days/${dayIndex}/copy`,
    payload,
  )
  return data
}

/**
 * Move a plan day onto another weekday in the same week.
 *
 * Matches plan-service PR #11 (open, not on main as of 2026-10-30):
 * https://github.com/ReFOiL/fitboddy-plan-service/pull/11
 *
 * `POST /api/v1/plans/clients/{client}/trainers/{trainer}/days/{day_index}/weekday`
 * `{ day_of_week: 0..6 }` Monday is 0.
 *
 * 200 `{ outcome: "set" | "swap", day_index, day_of_week, swapped_day_index, plan }`.
 * `plan` matches `GET .../active`. Render from `plan.days`. `day_index` is the path
 * day and does not change. `set` means the weekday was free (`swapped_day_index`
 * is null). `swap` exchanges `day_of_week` with the other day in that week.
 * 422 `day is already on that weekday` when the day is already there.
 */
export async function changePlanDayWeekday(
  clientUserId: string,
  trainerUserId: string,
  dayIndex: number,
  payload: ChangePlanDayWeekdayRequest,
): Promise<ChangePlanDayWeekdayResponse> {
  const { data } = await apiClient.post<ChangePlanDayWeekdayResponse>(
    `${trainerPlanRoot(clientUserId, trainerUserId)}/days/${dayIndex}/weekday`,
    payload,
  )
  return data
}

export async function copyPlanWeek(
  clientUserId: string,
  trainerUserId: string,
  week: number,
  payload: CopyPlanWeekRequest,
): Promise<TrainingPlan> {
  const { data } = await apiClient.post<TrainingPlan>(`${trainerPlanRoot(clientUserId, trainerUserId)}/weeks/${week}/copy`, payload)
  return data
}

/**
 * Anchor when the client's plan starts.
 *
 * plan-service main (and open PRs as of 2026-10-30) store `start_date` but do not
 * expose `start_mode` yet. This client follows the contract the backend PR should
 * implement:
 *
 * `PATCH /api/v1/plans/clients/{client}/trainers/{trainer}/start`
 * `{ start_mode: "next_workout" | "next_monday" | "date", start_date: "YYYY-MM-DD" | null }`
 *
 * `start_date` is required when `start_mode` is `date`. The response is the
 * active plan with week windows re-anchored to `start_date`. Days before that
 * date, including empty week-1 lead-in days, are not missed workouts.
 */
export async function setPlanStart(
  clientUserId: string,
  trainerUserId: string,
  payload: SetPlanStartRequest,
): Promise<TrainingPlan> {
  const { data } = await apiClient.patch<TrainingPlan>(`${trainerPlanRoot(clientUserId, trainerUserId)}/start`, payload)
  return data
}

export async function replacePlanDaySlots(
  clientUserId: string,
  trainerUserId: string,
  dayIndex: number,
  slots: PlanSlotWrite[],
): Promise<PlanDay> {
  const { data } = await apiClient.put<PlanDay>(
    `/api/v1/plans/clients/${encodeURIComponent(clientUserId)}/trainers/${encodeURIComponent(trainerUserId)}/days/${dayIndex}`,
    { slots },
  )
  return data
}

export async function getTrainerGenerationPolicy(trainerUserId: string): Promise<GenerationPolicy> {
  const { data } = await apiClient.get<GenerationPolicy>(
    `/api/v1/trainers/${encodeURIComponent(trainerUserId)}/generation-policy`,
  )
  return data
}

export async function upsertTrainerGenerationPolicy(
  trainerUserId: string,
  payload: GenerationPolicy,
): Promise<GenerationPolicy> {
  const { data } = await apiClient.put<GenerationPolicy>(
    `/api/v1/trainers/${encodeURIComponent(trainerUserId)}/generation-policy`,
    payload,
  )
  return data
}
