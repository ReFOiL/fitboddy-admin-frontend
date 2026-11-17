import { matchPath, Outlet, useLocation } from 'react-router-dom'

import { APP_PATHS, type AppRole } from '../../config'
import { isWideTrainerPath } from '../../lib/wide-canvas'
import { useAuth } from '../../hooks/use-auth'
import { useProfile } from '../../hooks/use-profile'
import { useMessagingSocket, useUnreadCount } from '../../hooks/use-messages'
import { cn } from '../../lib/utils'
import { PendingInviteRedirect } from '../invite/PendingInviteRedirect'
import { AppHeader } from './AppHeader'
import { MobileTabBar } from './MobileTabBar'

const STACK_PATTERNS = [
  APP_PATHS.clientProfile,
  APP_PATHS.exerciseDetails,
  APP_PATHS.clientExerciseDetails,
  APP_PATHS.planRules,
  APP_PATHS.profileOnboarding,
  APP_PATHS.trainerProfile,
  APP_PATHS.trainerInvite,
  APP_PATHS.analytics,
]

export function MainLayout() {
  const { user, logoutMutation } = useAuth()
  const location = useLocation()
  useMessagingSocket(Boolean(user))
  const unreadQuery = useUnreadCount(Boolean(user))
  const unreadCount = unreadQuery.data?.unread_count ?? 0
  const role: AppRole = user?.role === 'trainer' || user?.role === 'client' ? user.role : null
  const profile = useProfile(user?.user_id ?? '')
  const displayName = profile.profileQuery.data?.full_name?.trim() || user?.login || user?.email || 'Аккаунт'
  const isChatThread = Boolean(matchPath(APP_PATHS.messageThread, location.pathname))
  const isMessagesSection = location.pathname === APP_PATHS.messages || isChatThread
  const isStack = STACK_PATTERNS.some((pattern) => matchPath(pattern, location.pathname))
  const wideCanvas = isWideTrainerPath(location.pathname)

  return (
    <div
      className={cn(
        'flex min-h-dvh flex-col bg-background text-foreground',
        (isChatThread || isMessagesSection) && 'h-dvh overflow-hidden',
      )}
    >
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only"
      >
        Перейти к основному содержимому
      </a>
      <AppHeader
        role={role}
        displayName={displayName}
        unreadCount={unreadCount}
        logoutPending={logoutMutation.isPending}
        onLogout={() => logoutMutation.mutate()}
        hiddenOnMobile={isStack || isChatThread}
      />
      <PendingInviteRedirect />
      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          'mx-auto w-full flex-1',
          wideCanvas ? 'max-w-[1440px]' : 'max-w-6xl',
          (isChatThread || isMessagesSection) && 'min-h-0 overflow-hidden',
          isChatThread || isMessagesSection
            ? 'px-0 py-0 md:px-6 md:py-6'
            : wideCanvas
              ? 'px-4 py-4 md:px-8 md:py-5'
              : 'px-4 py-4 md:px-6 md:py-6',
          isChatThread
            ? 'pb-0 md:pb-6'
            : 'pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8',
        )}
      >
        <Outlet />
      </main>
      <MobileTabBar role={role} unreadCount={unreadCount} hidden={isChatThread} />
    </div>
  )
}
