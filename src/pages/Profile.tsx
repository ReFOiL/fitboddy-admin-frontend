import { Navigate, useParams } from 'react-router-dom'

import { APP_PATHS } from '../config'
import { useAuth } from '../hooks/use-auth'
import { ClientProfile } from './profile/ClientProfile'
import { TrainerProfilePage } from './TrainerProfilePage'

export function ProfilePage() {
  const { user } = useAuth()
  const { section } = useParams()
  if (user?.role === 'client') return <ClientProfile section={section} />
  if (section) return <Navigate to={APP_PATHS.profile} replace />
  return <TrainerProfilePage />
}
