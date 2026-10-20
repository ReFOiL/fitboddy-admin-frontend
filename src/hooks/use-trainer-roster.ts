import { useQueries, useQuery } from '@tanstack/react-query'
import axios from 'axios'

import { getActivePlan, listTrainerClients, queryKeys } from '../api'
import type { PlanLoadState } from '../lib/roster'
import type { TrainerClientRelation } from '../types/relation'
import type { TrainingPlan } from '../types/plan'

export type RosterRow = {
  relation: TrainerClientRelation
  planState: PlanLoadState
  plan: TrainingPlan | null
}

function planStateFromQuery(query: { isSuccess: boolean; isError: boolean; isPending: boolean; error: unknown }): PlanLoadState {
  if (query.isSuccess) return 'ready'
  if (query.isError) {
    const status = axios.isAxiosError(query.error) ? query.error.response?.status : undefined
    return status === 404 ? 'missing' : 'error'
  }
  if (query.isPending) return 'loading'
  return 'loading'
}

export function useTrainerRoster(trainerUserId: string) {
  const clientsQuery = useQuery({
    queryKey: queryKeys.relations.trainerClients(trainerUserId, 'active'),
    queryFn: async () => listTrainerClients(trainerUserId, 'active'),
    enabled: Boolean(trainerUserId),
  })
  const clients = clientsQuery.data ?? []
  const planQueries = useQueries({
    queries: clients.map((relation) => ({
      queryKey: queryKeys.plans.activeByUser(relation.client_user_id),
      queryFn: async () => getActivePlan(relation.client_user_id),
      enabled: Boolean(trainerUserId),
      retry: false,
    })),
  })

  const rows: RosterRow[] = clients.map((relation, index) => {
    const query = planQueries[index]
    return {
      relation,
      planState: query ? planStateFromQuery(query) : 'loading',
      plan: query?.data ?? null,
    }
  })

  return { clientsQuery, rows }
}
