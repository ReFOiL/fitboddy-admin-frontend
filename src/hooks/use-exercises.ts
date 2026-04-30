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
import type { UpsertTrainerExerciseRequest } from '../types/exercise'

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

  const addExerciseMutation = useMutation({
    mutationFn: async (params: { exerciseId: string; payload: UpsertTrainerExerciseRequest }) =>
      addTrainerExercise(trainerUserId, params.exerciseId, params.payload),
    onSuccess: () => {
      invalidateCatalog()
      toast.success('Упражнение добавлено')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось добавить упражнение')),
  })

  const updateExerciseMutation = useMutation({
    mutationFn: async (params: { exerciseId: string; payload: UpsertTrainerExerciseRequest }) =>
      updateTrainerExercise(trainerUserId, params.exerciseId, params.payload),
    onSuccess: () => {
      invalidateCatalog()
      toast.success('Упражнение обновлено')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось обновить упражнение')),
  })

  const archiveExerciseMutation = useMutation({
    mutationFn: async (exerciseId: string) => archiveTrainerExercise(trainerUserId, exerciseId),
    onSuccess: () => {
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
