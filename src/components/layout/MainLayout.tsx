import { matchPath, Outlet, useLocation } from 'react-router-dom'

import { APP_PATHS, type AppRole } from '../../config'
import { useAuth } from '../../hooks/use-auth'
import { useProfile } from '../../hooks/use-profile'
import { useTrainerRelationActions, useTrainerRelations, useUserIdGuard } from '../../hooks'
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
  const { withUserId } = useUserIdGuard()
  const location = useLocation()
  useMessagingSocket(Boolean(user))
  const unreadQuery = useUnreadCount(Boolean(user))
  const unreadCount = unreadQuery.data?.unread_count ?? 0
  const role: AppRole = user?.role === 'trainer' || user?.role === 'client' ? user.role : null
  const isTrainer = role === 'trainer'
  const trainerUserId = isTrainer && user?.user_id ? user.user_id : ''
  const profile = useProfile(user?.user_id ?? '')
  const displayName = profile.profileQuery.data?.full_name?.trim() || user?.login || user?.email || 'Аккаунт'
  const { trainerPublicationStatusQuery, upsertDiscoveryProfileMutation, leaveRelationMutation } = useTrainerRelations({
    trainerUserId,
  })
  const { togglePublication } = useTrainerRelationActions({
    withUserId,
    upsertDiscoveryProfileMutation,
    leaveRelationMutation,
  })
  const isChatThread = Boolean(matchPath(APP_PATHS.messageThread, location.pathname))
  const isMessagesSection = location.pathname === APP_PATHS.messages || isChatThread
  const isStack = STACK_PATTERNS.some((pattern) => matchPath(pattern, location.pathname))

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
        published={Boolean(trainerPublicationStatusQuery.data?.is_published)}
        publicationPending={upsertDiscoveryProfileMutation.isPending}
        onTogglePublication={
          isTrainer ? () => togglePublication(!trainerPublicationStatusQuery.data?.is_published) : undefined
        }
      />
      <PendingInviteRedirect />
      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          'mx-auto w-full max-w-6xl flex-1',
          (isChatThread || isMessagesSection) && 'min-h-0 overflow-hidden',
          isChatThread || isMessagesSection ? 'px-0 py-0 md:px-6 md:py-6' : 'px-4 py-4 md:px-6 md:py-6',
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
