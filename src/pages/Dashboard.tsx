import { ClientHome } from '../components/client/ClientHome'
import { TrainerHome } from '../components/trainer/TrainerHome'
import { useAuth } from '../hooks/use-auth'

export function DashboardPage() {
  const { user } = useAuth()
  if (user?.role === 'client' && user) return <ClientHome user={user} />
  return <TrainerHome />
}
