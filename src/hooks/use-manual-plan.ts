import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { toast } from 'sonner'

import {
  addPlanDay,
  copyPlanDay,
  copyPlanWeek,
  deletePlanDay,
  getTrainerClientPlan,
  patchPlanDayTime,
  queryKeys,
  replacePlanDaySlots,
} from '../api'
import { isSlotsDirty, isTimeDirty, slotsToWrite, type DayDraft } from '../lib/plan-draft'
import { getUserErrorMessage } from '../lib/user-error-message'
import type { AddPlanDayRequest, CopyPlanDayRequest, CopyPlanWeekRequest } from '../types/plan'

export function useManualPlan(clientUserId: string, trainerUserId: string) {
  const queryClient = useQueryClient()
  const planQuery = useQuery({
    queryKey: queryKeys.plans.trainerClientPlan(clientUserId, trainerUserId),
    queryFn: async () => getTrainerClientPlan(clientUserId, trainerUserId),
    enabled: Boolean(clientUserId && trainerUserId),
    retry: false,
  })

  const refreshPlan = async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.plans.trainerClientPlan(clientUserId, trainerUserId),
    })
    await queryClient.invalidateQueries({ queryKey: queryKeys.plans.activeByUser(clientUserId) })
  }

  const saveMutation = useMutation({
    mutationFn: async (input: { baseline: DayDraft[]; draft: DayDraft[] }) => {
      const baseByIndex = new Map(input.baseline.map((day) => [day.dayIndex, day]))
      for (const day of input.draft) {
        const original = baseByIndex.get(day.dayIndex)
        if (!original || isSlotsDirty(original, day)) {
          await replacePlanDaySlots(clientUserId, trainerUserId, day.dayIndex, slotsToWrite(day.slots))
        }
        if (original && isTimeDirty(original, day)) {
          await patchPlanDayTime(clientUserId, trainerUserId, day.dayIndex, day.scheduledTime)
        }
      }
    },
    onSuccess: async () => {
      await refreshPlan()
      toast.success('План сохранён')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось сохранить план.')),
  })

  const addDayMutation = useMutation({
    mutationFn: async (payload: AddPlanDayRequest) => addPlanDay(clientUserId, trainerUserId, payload),
    onSuccess: async () => {
      await refreshPlan()
      toast.success('День добавлен')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось добавить день.')),
  })

  const deleteDayMutation = useMutation({
    mutationFn: async (dayIndex: number) => deletePlanDay(clientUserId, trainerUserId, dayIndex),
    onSuccess: async () => {
      await refreshPlan()
      toast.success('День удалён')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось удалить день.')),
  })

  const copyDayMutation = useMutation({
    mutationFn: async (input: { dayIndex: number; payload: CopyPlanDayRequest }) =>
      copyPlanDay(clientUserId, trainerUserId, input.dayIndex, input.payload),
    onSuccess: async () => {
      await refreshPlan()
      toast.success('День скопирован')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось скопировать день.')),
  })

  const copyWeekMutation = useMutation({
    mutationFn: async (input: { week: number; payload: CopyPlanWeekRequest }) =>
      copyPlanWeek(clientUserId, trainerUserId, input.week, input.payload),
    onSuccess: async () => {
      await refreshPlan()
      toast.success('Неделя скопирована')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось скопировать неделю.')),
  })

  const status = axios.isAxiosError(planQuery.error) ? planQuery.error.response?.status : undefined

  return {
    planQuery,
    saveMutation,
    addDayMutation,
    deleteDayMutation,
    copyDayMutation,
    copyWeekMutation,
    isMissing: status === 404,
  }
}
