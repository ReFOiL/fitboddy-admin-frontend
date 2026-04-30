import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { generatePlan, getActivePlan, queryKeys } from '../api'
import type { GeneratePlanRequest } from '../types/plan'

function extractErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback
  return (error.response?.data as { detail?: string } | undefined)?.detail ?? fallback
}

export function usePlans(userId: string) {
  const queryClient = useQueryClient()

  const activePlanQuery = useQuery({
    queryKey: queryKeys.plans.activeByUser(userId),
    queryFn: async () => getActivePlan(userId),
    enabled: Boolean(userId),
    retry: false,
  })

  const generatePlanMutation = useMutation({
    mutationFn: async (payload: GeneratePlanRequest) => generatePlan(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.plans.activeByUser(userId),
      })
      toast.success('План сгенерирован')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Не удалось сгенерировать план')),
  })

  return {
    activePlanQuery,
    generatePlanMutation,
  }
}
