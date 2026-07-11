import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  addTrainerExercise,
  archiveTrainerExercise,
  deleteTrainerExerciseVideo,
  listTrainerExercises,
  queryKeys,
  updateTrainerExercise,
  uploadTrainerExerciseVideo,
} from '../api'
import type { TrainerExercise, UpsertTrainerExerciseRequest } from '../types/exercise'

function extractErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback
  return (error.response?.data as { detail?: string } | undefined)?.detail ?? fallback
}

export function useExercises(params: { trainerUserId: string; includeArchived: boolean }) {
  const { trainerUserId, includeArchived } = params
  const queryClient = useQueryClient()

  const trainerCatalogQuery = useQuery({
    queryKey: queryKeys.exercises.trainerCatalog(trainerUserId, includeArchived),
    queryFn: async () => listTrainerExercises(trainerUserId, includeArchived),
    enabled: Boolean(trainerUserId),
    retry: false,
  })

  const invalidateCatalog = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.exercises.trainerCatalog(trainerUserId, false),
    })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.exercises.trainerCatalog(trainerUserId, true),
    })
  }

  const upsertExerciseInCatalogCache = (updatedExercise: TrainerExercise) => {
    const writeCatalog = (showArchived: boolean) => {
      queryClient.setQueryData<TrainerExercise[]>(
        queryKeys.exercises.trainerCatalog(trainerUserId, showArchived),
        (current) => {
          if (!Array.isArray(current) || current.length === 0) {
            return showArchived || updatedExercise.is_active ? [updatedExercise] : []
          }

          let found = false
          const next = current.map((exercise) => {
            if (exercise.row_id !== updatedExercise.row_id) return exercise
            found = true
            return updatedExercise
          })

          if (found) {
            if (!showArchived && !updatedExercise.is_active) {
              return next.filter((exercise) => exercise.row_id !== updatedExercise.row_id)
            }
            return next
          }

          if (!showArchived && !updatedExercise.is_active) return next
          return [...next, updatedExercise]
        },
      )
    }

    writeCatalog(false)
    writeCatalog(true)
  }

  const patchExerciseVideoInCatalogCache = (rowId: string, videoUrl: string | null) => {
    const writeCatalog = (showArchived: boolean) => {
      queryClient.setQueryData<TrainerExercise[]>(
        queryKeys.exercises.trainerCatalog(trainerUserId, showArchived),
        (current) => {
          if (!Array.isArray(current)) return current
          return current.map((exercise) =>
            exercise.row_id === rowId ? { ...exercise, video_url: videoUrl } : exercise,
          )
        },
      )
    }
    writeCatalog(false)
    writeCatalog(true)
  }

  const markExerciseArchivedInCatalogCache = (rowId: string) => {
    queryClient.setQueryData<TrainerExercise[]>(
      queryKeys.exercises.trainerCatalog(trainerUserId, false),
      (current) => {
        if (!Array.isArray(current)) return current
        return current.filter((exercise) => exercise.row_id !== rowId)
      },
    )
    queryClient.setQueryData<TrainerExercise[]>(
      queryKeys.exercises.trainerCatalog(trainerUserId, true),
      (current) => {
        if (!Array.isArray(current)) return current
        return current.map((exercise) =>
          exercise.row_id === rowId ? { ...exercise, is_active: false } : exercise,
        )
      },
    )
  }

  const addExerciseMutation = useMutation({
    mutationFn: async (payload: UpsertTrainerExerciseRequest) => addTrainerExercise(trainerUserId, payload),
    onSuccess: (createdExercise) => {
      upsertExerciseInCatalogCache(createdExercise)
      invalidateCatalog()
      toast.success('Упражнение добавлено')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось добавить упражнение')),
  })

  const updateExerciseMutation = useMutation({
    mutationFn: async (params: { rowId: string; payload: UpsertTrainerExerciseRequest }) =>
      updateTrainerExercise(trainerUserId, params.rowId, params.payload),
    onSuccess: (updatedExercise) => {
      upsertExerciseInCatalogCache(updatedExercise)
      invalidateCatalog()
      toast.success('Упражнение обновлено')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось обновить упражнение')),
  })

  const archiveExerciseMutation = useMutation({
    mutationFn: async (rowId: string) => archiveTrainerExercise(trainerUserId, rowId),
    onSuccess: (_, rowId) => {
      markExerciseArchivedInCatalogCache(rowId)
      invalidateCatalog()
      toast.success('Упражнение архивировано')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось архивировать упражнение')),
  })

  const uploadVideoMutation = useMutation({
    mutationFn: async (params: { rowId: string; file: File }) =>
      uploadTrainerExerciseVideo(trainerUserId, params.rowId, params.file),
    onSuccess: (payload) => {
      patchExerciseVideoInCatalogCache(payload.row_id, payload.video_url)
      invalidateCatalog()
      toast.success('Видео загружено')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось загрузить видео')),
  })

  const deleteVideoMutation = useMutation({
    mutationFn: async (rowId: string) => deleteTrainerExerciseVideo(trainerUserId, rowId),
    onSuccess: (_, rowId) => {
      patchExerciseVideoInCatalogCache(rowId, null)
      invalidateCatalog()
      toast.success('Видео удалено')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось удалить видео')),
  })

  return {
    trainerCatalogQuery,
    addExerciseMutation,
    updateExerciseMutation,
    archiveExerciseMutation,
    uploadVideoMutation,
    deleteVideoMutation,
  }
}
