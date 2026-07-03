import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import type { AppRole } from '../config/app-routes'

type RoleRouteProps = {
  currentRole: AppRole
  allowedRoles: Exclude<AppRole, null>[]
  fallbackTo: string
  children: ReactNode
}

export function RoleRoute({ currentRole, allowedRoles, fallbackTo, children }: RoleRouteProps) {
  if (currentRole && allowedRoles.includes(currentRole)) return <>{children}</>
  return <Navigate to={fallbackTo} replace />
}
