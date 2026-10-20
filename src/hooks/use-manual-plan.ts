import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { toast } from 'sonner'

import { getTrainerClientPlan, queryKeys, replacePlanDaySlots } from '../api'
import { slotsToWrite, type DayDraft } from '../lib/plan-draft'
import { getUserErrorMessage } from '../lib/user-error-message'

export function useManualPlan(clientUserId: string, trainerUserId: string) {
  const queryClient = useQueryClient()
  const planQuery = useQuery({
    queryKey: queryKeys.plans.trainerClientPlan(clientUserId, trainerUserId),
    queryFn: async () => getTrainerClientPlan(clientUserId, trainerUserId),
    enabled: Boolean(clientUserId && trainerUserId),
    retry: false,
  })

  const saveMutation = useMutation({
    mutationFn: async (days: DayDraft[]) => {
      for (const day of days) {
        await replacePlanDaySlots(clientUserId, trainerUserId, day.dayIndex, slotsToWrite(day.slots))
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.plans.trainerClientPlan(clientUserId, trainerUserId),
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.plans.activeByUser(clientUserId) })
      toast.success('План сохранён')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось сохранить план.')),
  })

  const status = axios.isAxiosError(planQuery.error) ? planQuery.error.response?.status : undefined

  return {
    planQuery,
    saveMutation,
    isMissing: status === 404,
  }
}
