import { apiClient } from './client'
import type { ExerciseVideoUploadResponse, TrainerExercise, UpsertTrainerExerciseRequest } from '../types/exercise'

export async function listTrainerExercises(
  trainerUserId: string,
  includeArchived = false,
): Promise<TrainerExercise[]> {
  const { data } = await apiClient.get<TrainerExercise[]>(
    `/api/v1/trainers/${encodeURIComponent(trainerUserId)}/exercises`,
    {
      params: { include_archived: includeArchived },
    },
  )
  return Array.isArray(data) ? data : []
}

export async function getTrainerExercise(trainerUserId: string, exerciseId: string): Promise<TrainerExercise> {
  const { data } = await apiClient.get<TrainerExercise>(
    `/api/v1/trainers/${encodeURIComponent(trainerUserId)}/exercises/${encodeURIComponent(exerciseId)}`,
  )
  return data
}

export async function addTrainerExercise(
  trainerUserId: string,
  exerciseId: string,
  payload: UpsertTrainerExerciseRequest,
): Promise<TrainerExercise> {
  const { data } = await apiClient.post<TrainerExercise>(
    `/api/v1/trainers/${encodeURIComponent(trainerUserId)}/exercises/${encodeURIComponent(exerciseId)}`,
    payload,
  )
  return data
}

export async function updateTrainerExercise(
  trainerUserId: string,
  exerciseId: string,
  payload: UpsertTrainerExerciseRequest,
): Promise<TrainerExercise> {
  const { data } = await apiClient.put<TrainerExercise>(
    `/api/v1/trainers/${encodeURIComponent(trainerUserId)}/exercises/${encodeURIComponent(exerciseId)}`,
    payload,
  )
  return data
}

export async function archiveTrainerExercise(trainerUserId: string, exerciseId: string): Promise<void> {
  await apiClient.post(`/api/v1/trainers/${encodeURIComponent(trainerUserId)}/exercises/${encodeURIComponent(exerciseId)}/archive`)
}

export async function uploadTrainerExerciseVideo(
  trainerUserId: string,
  exerciseId: string,
  file: File,
): Promise<ExerciseVideoUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post<ExerciseVideoUploadResponse>(
    `/api/v1/trainers/${encodeURIComponent(trainerUserId)}/exercises/${encodeURIComponent(exerciseId)}/video`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300_000,
    },
  )
  return data
}

export async function deleteTrainerExerciseVideo(trainerUserId: string, exerciseId: string): Promise<void> {
  await apiClient.delete(
    `/api/v1/trainers/${encodeURIComponent(trainerUserId)}/exercises/${encodeURIComponent(exerciseId)}/video`,
  )
}
