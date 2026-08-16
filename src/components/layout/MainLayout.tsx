import { Outlet, matchPath, useLocation } from 'react-router-dom'

import { APP_PATHS, type AppRole } from '../../config'
import { useAuth } from '../../hooks/use-auth'
import { useMessagingSocket, useUnreadCount } from '../../hooks/use-messages'
import { cn } from '../../lib/utils'
import { AppHeader } from './AppHeader'
import { MobileTabBar } from './MobileTabBar'

export function MainLayout() {
  const { user, logoutMutation } = useAuth()
  const location = useLocation()
  useMessagingSocket(Boolean(user))
  const unreadQuery = useUnreadCount(Boolean(user))
  const unreadCount = unreadQuery.data?.unread_count ?? 0
  const role: AppRole = user?.role === 'trainer' || user?.role === 'client' ? user.role : null
  const isChatThread = Boolean(matchPath(APP_PATHS.messageThread, location.pathname))
  const isMessagesSection = location.pathname === APP_PATHS.messages || isChatThread

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
        email={user?.email}
        unreadCount={unreadCount}
        logoutPending={logoutMutation.isPending}
        onLogout={() => logoutMutation.mutate()}
      />
      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          'mx-auto w-full max-w-6xl flex-1',
          (isChatThread || isMessagesSection) && 'min-h-0 overflow-hidden',
          isChatThread || isMessagesSection ? 'px-0 py-0 md:px-6 md:py-6' : 'px-4 py-4 md:px-6 md:py-6',
          isChatThread
            ? 'pb-0 md:pb-6'
            : isMessagesSection
              ? 'pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-6'
              : 'pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-6',
        )}
      >
        <Outlet />
      </main>
      <MobileTabBar role={role} unreadCount={unreadCount} hidden={isChatThread} />
    </div>
  )
}
