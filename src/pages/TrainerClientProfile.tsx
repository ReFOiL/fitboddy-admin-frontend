import { useMemo } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'

import { PlanStudio } from '../components/trainer/PlanStudio'
import { useAuth } from '../hooks/use-auth'
import { useTrainerRoster } from '../hooks/use-trainer-roster'
import { APP_PATHS } from '../config'

export function TrainerClientProfilePage() {
  const { user } = useAuth()
  const isTrainer = user?.role === 'trainer'
  const trainerUserId = isTrainer && user?.user_id ? user.user_id : ''
  const [searchParams] = useSearchParams()
  const requestedClientUserId = (searchParams.get('clientUserId') ?? '').trim()
  const initialScreen = searchParams.get('screen') === 'progress' ? 'progress' : 'plan'
  const { rows, clientsQuery } = useTrainerRoster(trainerUserId)
  const clientUserId = useMemo(() => {
    if (requestedClientUserId && rows.some((row) => row.relation.client_user_id === requestedClientUserId)) {
      return requestedClientUserId
    }
    if (requestedClientUserId && clientsQuery.isLoading) return requestedClientUserId
    return rows[0]?.relation.client_user_id ?? requestedClientUserId
  }, [clientsQuery.isLoading, requestedClientUserId, rows])

  if (!isTrainer) return <Navigate to={APP_PATHS.home} replace />
  if (!clientUserId) {
    return <p className="py-8 text-[17px]">{clientsQuery.isLoading ? 'Загрузка…' : 'Клиентов пока нет'}</p>
  }

  return <PlanStudio key={clientUserId} clientUserId={clientUserId} initialScreen={initialScreen} />
}
