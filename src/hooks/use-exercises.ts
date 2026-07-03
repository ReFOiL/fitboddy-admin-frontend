import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  addTrainerExercise,
  archiveTrainerExercise,
  listTrainerExercises,
  queryKeys,
  updateTrainerExercise,
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
            if (exercise.exercise_id !== updatedExercise.exercise_id) return exercise
            found = true
            return updatedExercise
          })

          if (found) {
            if (!showArchived && !updatedExercise.is_active) {
              return next.filter((exercise) => exercise.exercise_id !== updatedExercise.exercise_id)
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

  const markExerciseArchivedInCatalogCache = (exerciseId: string) => {
    queryClient.setQueryData<TrainerExercise[]>(
      queryKeys.exercises.trainerCatalog(trainerUserId, false),
      (current) => {
        if (!Array.isArray(current)) return current
        return current.filter((exercise) => exercise.exercise_id !== exerciseId)
      },
    )
    queryClient.setQueryData<TrainerExercise[]>(
      queryKeys.exercises.trainerCatalog(trainerUserId, true),
      (current) => {
        if (!Array.isArray(current)) return current
        return current.map((exercise) =>
          exercise.exercise_id === exerciseId ? { ...exercise, is_active: false } : exercise,
        )
      },
    )
  }

  const addExerciseMutation = useMutation({
    mutationFn: async (params: { exerciseId: string; payload: UpsertTrainerExerciseRequest }) =>
      addTrainerExercise(trainerUserId, params.exerciseId, params.payload),
    onSuccess: (createdExercise) => {
      upsertExerciseInCatalogCache(createdExercise)
      invalidateCatalog()
      toast.success('Упражнение добавлено')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось добавить упражнение')),
  })

  const updateExerciseMutation = useMutation({
    mutationFn: async (params: { exerciseId: string; payload: UpsertTrainerExerciseRequest }) =>
      updateTrainerExercise(trainerUserId, params.exerciseId, params.payload),
    onSuccess: (updatedExercise) => {
      upsertExerciseInCatalogCache(updatedExercise)
      invalidateCatalog()
      toast.success('Упражнение обновлено')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось обновить упражнение')),
  })

  const archiveExerciseMutation = useMutation({
    mutationFn: async (exerciseId: string) => archiveTrainerExercise(trainerUserId, exerciseId),
    onSuccess: (_, exerciseId) => {
      markExerciseArchivedInCatalogCache(exerciseId)
      invalidateCatalog()
      toast.success('Упражнение архивировано')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось архивировать упражнение')),
  })

  return {
    trainerCatalogQuery,
    addExerciseMutation,
    updateExerciseMutation,
    archiveExerciseMutation,
  }
}
