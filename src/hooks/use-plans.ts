import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  completePlanDay,
  generatePlan,
  getActivePlan,
  getTodayWorkout,
  listClientLoads,
  listClientPlatformLoads,
  queryKeys,
  replacePlanExercise,
  upsertClientLoad,
  upsertClientPlatformLoad,
} from '../api'
import { getUserErrorMessage } from '../lib/user-error-message'
import type { UpsertClientLoadRequest } from '../types/exercise'
import type { GeneratePlanRequest } from '../types/plan'

export function usePlans(userId: string) {
  const queryClient = useQueryClient()

  const activePlanQuery = useQuery({
    queryKey: queryKeys.plans.activeByUser(userId),
    queryFn: async () => getActivePlan(userId),
    enabled: Boolean(userId),
    retry: false,
  })

  const todayWorkoutQuery = useQuery({
    queryKey: queryKeys.plans.today(userId),
    queryFn: async () => getTodayWorkout(),
    enabled: Boolean(userId),
    retry: false,
  })

  const generatePlanMutation = useMutation({
    mutationFn: async (payload: GeneratePlanRequest) => generatePlan(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.plans.activeByUser(userId),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans.today(userId) })
      toast.success('План сгенерирован')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось сгенерировать план.')),
  })

  const completeDayMutation = useMutation({
    mutationFn: async (dayIndex: number) => completePlanDay(dayIndex),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans.today(userId) })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.plans.activeByUser(userId),
      })
      toast.success('Тренировка отмечена выполненной')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось отметить тренировку.')),
  })

  const replaceExerciseMutation = useMutation({
    mutationFn: async (input: { dayIndex: number; lineId: string }) =>
      replacePlanExercise(input.dayIndex, input.lineId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans.today(userId) })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.plans.activeByUser(userId),
      })
      toast.success('Упражнение заменено')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось заменить упражнение.')),
  })

  return {
    activePlanQuery,
    todayWorkoutQuery,
    generatePlanMutation,
    completeDayMutation,
    replaceExerciseMutation,
  }
}

export function useClientLoads(clientUserId: string, trainerUserId: string) {
  const queryClient = useQueryClient()

  const loadsQuery = useQuery({
    queryKey: queryKeys.plans.clientLoads(clientUserId, trainerUserId),
    queryFn: async () => listClientLoads(clientUserId, trainerUserId),
    enabled: Boolean(clientUserId && trainerUserId),
    select: (data) => (Array.isArray(data) ? data : []),
  })

  const upsertLoadMutation = useMutation({
    mutationFn: async (input: { exerciseRowId: string; payload: UpsertClientLoadRequest }) =>
      upsertClientLoad(clientUserId, trainerUserId, input.exerciseRowId, input.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.plans.clientLoads(clientUserId, trainerUserId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.plans.activeByUser(clientUserId),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans.today(clientUserId) })
      toast.success('Рабочий вес сохранён')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось сохранить вес.')),
  })

  return {
    loadsQuery,
    upsertLoadMutation,
  }
}

export function useClientPlatformLoads(clientUserId: string) {
  const queryClient = useQueryClient()

  const loadsQuery = useQuery({
    queryKey: queryKeys.plans.clientPlatformLoads(clientUserId),
    queryFn: async () => listClientPlatformLoads(clientUserId),
    enabled: Boolean(clientUserId),
    select: (data) => (Array.isArray(data) ? data : []),
  })

  const upsertLoadMutation = useMutation({
    mutationFn: async (input: { exerciseRowId: string; payload: UpsertClientLoadRequest }) =>
      upsertClientPlatformLoad(clientUserId, input.exerciseRowId, input.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.plans.clientPlatformLoads(clientUserId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.plans.activeByUser(clientUserId),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans.today(clientUserId) })
      toast.success('Рабочий вес сохранён')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось сохранить вес.')),
  })

  return {
    loadsQuery,
    upsertLoadMutation,
  }
}
