import { adminPlatformExercisePhotoPath, trainerExercisePhotoPath } from '../lib/exercise-photos'
import type {
  ExercisePhotoPosition,
  ExercisePhotoUploadResponse,
  ExerciseVideoUploadResponse,
  Muscle,
  PlatformExercise,
  PlatformExercisePhotoUploadResponse,
  TrainerExercise,
  UpsertTrainerExerciseRequest,
} from '../types/exercise'
import { apiClient } from './client'

export async function listMuscles(): Promise<Muscle[]> {
  const { data } = await apiClient.get<Muscle[]>('/api/v1/muscles')
  return Array.isArray(data) ? data : []
}

export async function listTrainerExercises(
  trainerUserId: string,
  includeArchived = false,
): Promise<TrainerExercise[]> {
  const { data } = await apiClient.get<TrainerExercise[]>(
    `/api/v1/trainers/${encodeURIComponent(trainerUserId)}/exercises`,
    { params: { include_archived: includeArchived } },
  )
  return data
}

export async function listPlatformExercises(): Promise<PlatformExercise[]> {
  const { data } = await apiClient.get<PlatformExercise[] | unknown>('/api/v1/platform-exercises')
  return Array.isArray(data) ? data : []
}

export async function getPlatformExercise(rowId: string): Promise<PlatformExercise> {
  const { data } = await apiClient.get<PlatformExercise>(
    `/api/v1/platform-exercises/${encodeURIComponent(rowId)}`,
  )
  return data
}

export async function getTrainerExercise(trainerUserId: string, rowId: string): Promise<TrainerExercise> {
  const { data } = await apiClient.get<TrainerExercise>(
    `/api/v1/trainers/${encodeURIComponent(trainerUserId)}/exercises/${encodeURIComponent(rowId)}`,
  )
  return data
}

export async function addTrainerExercise(
  trainerUserId: string,
  payload: UpsertTrainerExerciseRequest,
): Promise<TrainerExercise> {
  const { data } = await apiClient.post<TrainerExercise>(
    `/api/v1/trainers/${encodeURIComponent(trainerUserId)}/exercises`,
    payload,
  )
  return data
}

export async function updateTrainerExercise(
  trainerUserId: string,
  rowId: string,
  payload: UpsertTrainerExerciseRequest,
): Promise<TrainerExercise> {
  const { data } = await apiClient.put<TrainerExercise>(
    `/api/v1/trainers/${encodeURIComponent(trainerUserId)}/exercises/${encodeURIComponent(rowId)}`,
    payload,
  )
  return data
}

export async function archiveTrainerExercise(trainerUserId: string, rowId: string): Promise<void> {
  await apiClient.post(
    `/api/v1/trainers/${encodeURIComponent(trainerUserId)}/exercises/${encodeURIComponent(rowId)}/archive`,
  )
}

export async function restoreTrainerExercise(trainerUserId: string, rowId: string): Promise<void> {
  await apiClient.post(
    `/api/v1/trainers/${encodeURIComponent(trainerUserId)}/exercises/${encodeURIComponent(rowId)}/restore`,
  )
}

export async function uploadTrainerExerciseVideo(
  trainerUserId: string,
  rowId: string,
  file: File,
): Promise<ExerciseVideoUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post<ExerciseVideoUploadResponse>(
    `/api/v1/trainers/${encodeURIComponent(trainerUserId)}/exercises/${encodeURIComponent(rowId)}/video`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return data
}

export async function deleteTrainerExerciseVideo(trainerUserId: string, rowId: string): Promise<void> {
  await apiClient.delete(
    `/api/v1/trainers/${encodeURIComponent(trainerUserId)}/exercises/${encodeURIComponent(rowId)}/video`,
  )
}

async function uploadExercisePhoto<T>(url: string, file: File): Promise<T> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post<T>(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function uploadTrainerExercisePhoto(
  trainerUserId: string,
  rowId: string,
  position: ExercisePhotoPosition,
  file: File,
): Promise<ExercisePhotoUploadResponse> {
  return uploadExercisePhoto<ExercisePhotoUploadResponse>(
    trainerExercisePhotoPath(trainerUserId, rowId, position),
    file,
  )
}

export async function deleteTrainerExercisePhoto(
  trainerUserId: string,
  rowId: string,
  position: ExercisePhotoPosition,
): Promise<void> {
  await apiClient.delete(trainerExercisePhotoPath(trainerUserId, rowId, position))
}

export async function uploadAdminPlatformExercisePhoto(
  rowId: string,
  position: ExercisePhotoPosition,
  file: File,
): Promise<PlatformExercisePhotoUploadResponse> {
  return uploadExercisePhoto<PlatformExercisePhotoUploadResponse>(
    adminPlatformExercisePhotoPath(rowId, position),
    file,
  )
}

export async function deleteAdminPlatformExercisePhoto(
  rowId: string,
  position: ExercisePhotoPosition,
): Promise<void> {
  await apiClient.delete(adminPlatformExercisePhotoPath(rowId, position))
}
