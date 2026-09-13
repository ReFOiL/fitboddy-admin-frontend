import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  addTrainerExercise,
  archiveTrainerExercise,
  deleteAdminPlatformExercisePhoto,
  deleteTrainerExercisePhoto,
  deleteTrainerExerciseVideo,
  listTrainerExercises,
  queryKeys,
  restoreTrainerExercise,
  updateTrainerExercise,
  uploadAdminPlatformExercisePhoto,
  uploadTrainerExercisePhoto,
  uploadTrainerExerciseVideo,
} from '../api'
import { photoUrlField } from '../lib/exercise-photos'
import { getUserErrorMessage } from '../lib/user-error-message'
import type { ExercisePhotoPosition, PlatformExercise, TrainerExercise, UpsertTrainerExerciseRequest } from '../types/exercise'

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

  const patchExerciseInCatalogCache = (rowId: string, patch: Partial<TrainerExercise>) => {
    const writeCatalog = (showArchived: boolean) => {
      queryClient.setQueryData<TrainerExercise[]>(
        queryKeys.exercises.trainerCatalog(trainerUserId, showArchived),
        (current) => {
          if (!Array.isArray(current)) return current
          return current.map((exercise) =>
            exercise.row_id === rowId ? { ...exercise, ...patch } : exercise,
          )
        },
      )
    }
    writeCatalog(false)
    writeCatalog(true)
    queryClient.setQueryData<TrainerExercise>(
      queryKeys.exercises.trainerExercise(trainerUserId, rowId),
      (current) => (current ? { ...current, ...patch } : current),
    )
  }

  const patchExerciseVideoInCatalogCache = (rowId: string, videoUrl: string | null) => {
    patchExerciseInCatalogCache(rowId, { video_url: videoUrl })
  }

  const patchExercisePhotoInCatalogCache = (
    rowId: string,
    position: ExercisePhotoPosition,
    imageUrl: string | null,
  ) => {
    patchExerciseInCatalogCache(rowId, { [photoUrlField(position)]: imageUrl })
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

  const markExerciseRestoredInCatalogCache = (rowId: string) => {
    let restoredExercise: TrainerExercise | null = null
    queryClient.setQueryData<TrainerExercise[]>(
      queryKeys.exercises.trainerCatalog(trainerUserId, true),
      (current) => {
        if (!Array.isArray(current)) return current
        return current.map((exercise) => {
          if (exercise.row_id !== rowId) return exercise
          restoredExercise = { ...exercise, is_active: true }
          return restoredExercise
        })
      },
    )
    if (restoredExercise == null) return
    const activeExercise = restoredExercise
    queryClient.setQueryData<TrainerExercise[]>(
      queryKeys.exercises.trainerCatalog(trainerUserId, false),
      (current) => {
        if (!Array.isArray(current)) return [activeExercise]
        if (current.some((exercise) => exercise.row_id === rowId)) {
          return current.map((exercise) =>
            exercise.row_id === rowId ? { ...exercise, is_active: true } : exercise,
          )
        }
        return [...current, activeExercise]
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
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось добавить упражнение.')),
  })

  const updateExerciseMutation = useMutation({
    mutationFn: async (params: { rowId: string; payload: UpsertTrainerExerciseRequest }) =>
      updateTrainerExercise(trainerUserId, params.rowId, params.payload),
    onSuccess: (updatedExercise) => {
      upsertExerciseInCatalogCache(updatedExercise)
      invalidateCatalog()
      toast.success('Упражнение обновлено')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось обновить упражнение.')),
  })

  const archiveExerciseMutation = useMutation({
    mutationFn: async (rowId: string) => archiveTrainerExercise(trainerUserId, rowId),
    onSuccess: (_, rowId) => {
      markExerciseArchivedInCatalogCache(rowId)
      invalidateCatalog()
      toast.success('Упражнение архивировано')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось архивировать упражнение.')),
  })

  const restoreExerciseMutation = useMutation({
    mutationFn: async (rowId: string) => restoreTrainerExercise(trainerUserId, rowId),
    onSuccess: (_, rowId) => {
      markExerciseRestoredInCatalogCache(rowId)
      invalidateCatalog()
      toast.success('Упражнение восстановлено из архива')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось восстановить упражнение.')),
  })

  const uploadVideoMutation = useMutation({
    mutationFn: async (params: { rowId: string; file: File }) =>
      uploadTrainerExerciseVideo(trainerUserId, params.rowId, params.file),
    onSuccess: (payload) => {
      patchExerciseVideoInCatalogCache(payload.row_id, payload.video_url)
      invalidateCatalog()
      toast.success('Видео загружено')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось загрузить видео.')),
  })

  const deleteVideoMutation = useMutation({
    mutationFn: async (rowId: string) => deleteTrainerExerciseVideo(trainerUserId, rowId),
    onSuccess: (_, rowId) => {
      patchExerciseVideoInCatalogCache(rowId, null)
      invalidateCatalog()
      toast.success('Видео удалено')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось удалить видео.')),
  })

  const uploadPhotoMutation = useMutation({
    mutationFn: async (params: { rowId: string; position: ExercisePhotoPosition; file: File }) =>
      uploadTrainerExercisePhoto(trainerUserId, params.rowId, params.position, params.file),
    onSuccess: (payload) => {
      patchExercisePhotoInCatalogCache(payload.row_id, payload.position, payload.image_url)
      invalidateCatalog()
      toast.success('Фото загружено')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось загрузить фото.')),
  })

  const deletePhotoMutation = useMutation({
    mutationFn: async (params: { rowId: string; position: ExercisePhotoPosition }) =>
      deleteTrainerExercisePhoto(trainerUserId, params.rowId, params.position),
    onSuccess: (_, params) => {
      patchExercisePhotoInCatalogCache(params.rowId, params.position, null)
      invalidateCatalog()
      toast.success('Фото удалено')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось удалить фото.')),
  })

  return {
    trainerCatalogQuery,
    addExerciseMutation,
    updateExerciseMutation,
    archiveExerciseMutation,
    restoreExerciseMutation,
    uploadVideoMutation,
    deleteVideoMutation,
    uploadPhotoMutation,
    deletePhotoMutation,
  }
}

export function usePlatformExercisePhotos() {
  const queryClient = useQueryClient()

  const invalidatePlatformExercises = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.exercises.platformCatalog })
    void queryClient.invalidateQueries({ queryKey: ['exercises', 'platform-exercise'] })
  }

  const patchPlatformExercisePhoto = (
    rowId: string,
    position: ExercisePhotoPosition,
    imageUrl: string | null,
  ) => {
    const field = photoUrlField(position)
    queryClient.setQueryData<PlatformExercise>(
      queryKeys.exercises.platformExercise(rowId),
      (current) => (current ? { ...current, [field]: imageUrl } : current),
    )
    queryClient.setQueryData<PlatformExercise[]>(queryKeys.exercises.platformCatalog, (current) => {
      if (!Array.isArray(current)) return current
      return current.map((exercise) =>
        exercise.row_id === rowId ? { ...exercise, [field]: imageUrl } : exercise,
      )
    })
  }

  const uploadPhotoMutation = useMutation({
    mutationFn: async (params: { rowId: string; position: ExercisePhotoPosition; file: File }) =>
      uploadAdminPlatformExercisePhoto(params.rowId, params.position, params.file),
    onSuccess: (payload) => {
      patchPlatformExercisePhoto(payload.row_id, payload.position, payload.image_url)
      invalidatePlatformExercises()
      toast.success('Фото загружено')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось загрузить фото.')),
  })

  const deletePhotoMutation = useMutation({
    mutationFn: async (params: { rowId: string; position: ExercisePhotoPosition }) =>
      deleteAdminPlatformExercisePhoto(params.rowId, params.position),
    onSuccess: (_, params) => {
      patchPlatformExercisePhoto(params.rowId, params.position, null)
      invalidatePlatformExercises()
      toast.success('Фото удалено')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось удалить фото.')),
  })

  return {
    uploadPhotoMutation,
    deletePhotoMutation,
  }
}
