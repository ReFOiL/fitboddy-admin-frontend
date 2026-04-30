import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../hooks/use-auth'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { isAuthenticated, meQuery, refreshMutation, refreshToken } = useAuth()

  useEffect(() => {
    const status = (meQuery.error as { response?: { status?: number } } | null)?.response?.status
    if (isAuthenticated && status === 401 && refreshToken && !refreshMutation.isPending) {
      refreshMutation.mutate(undefined, {
        onSuccess: () => {
          void meQuery.refetch()
        },
      })
    }
  }, [isAuthenticated, meQuery, refreshMutation, refreshToken])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (meQuery.isPending || refreshMutation.isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-secondary-foreground">
        Проверяем сессию...
      </div>
    )
  }

  if (meQuery.isError) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
