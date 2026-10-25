import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { APP_PATHS } from '../../config'
import { useAuth } from '../../hooks/use-auth'
import { inviteLandingPath, readPendingInviteCode } from '../../lib/invite'

// Пока клиент на анкете, код остаётся в sessionStorage. Accept — после неё или со следующей страницы.
export function PendingInviteRedirect() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const onboarding = location.pathname === APP_PATHS.profileOnboarding

  useEffect(() => {
    if (user?.role !== 'client' || onboarding) return
    const code = readPendingInviteCode()
    if (!code) return
    navigate(inviteLandingPath(code), { replace: true })
  }, [navigate, onboarding, user?.role])

  return null
}
