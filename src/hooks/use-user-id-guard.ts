import { useCallback } from 'react'

import { useAuth } from './use-auth'

export function useUserIdGuard() {
  const { user } = useAuth()
  const userId = user?.user_id ?? ''

  const withUserId = useCallback(
    (action: (resolvedUserId: string) => void) => {
      if (!userId) return
      action(userId)
    },
    [userId],
  )

  return {
    user,
    userId,
    withUserId,
  }
}
