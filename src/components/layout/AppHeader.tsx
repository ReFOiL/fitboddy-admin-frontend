import { MessageSquare } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { APP_BRAND_NAME, APP_PATHS, type AppRole } from '../../config'
import { cn } from '../../lib/utils'
import { UnreadBadge } from '../shared'
import { Button } from '../ui/button'
import { DesktopNav } from './DesktopNav'

type AppHeaderProps = {
  role: AppRole
  email?: string
  unreadCount: number
  logoutPending: boolean
  onLogout: () => void
}

export function AppHeader({ role, email, unreadCount, logoutPending, onLogout }: AppHeaderProps) {
  const isTrainer = role === 'trainer'

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-border/80 bg-[rgba(15,17,21,0.92)] pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between gap-3 px-4 md:h-16 md:px-6">
        <div className="truncate text-sm font-semibold md:hidden">{APP_BRAND_NAME}</div>
        <div className="hidden rounded-lg border border-border/80 bg-secondary/60 px-3 py-1 text-xs text-secondary-foreground md:block">
          {APP_BRAND_NAME} Платформа
        </div>

        <DesktopNav role={role} unreadCount={unreadCount} />

        <div className="flex items-center gap-2 md:gap-3">
          {isTrainer ? (
            <NavLink
              to={APP_PATHS.messages}
              className="relative rounded-lg p-2.5 text-secondary-foreground hover:bg-secondary/70 md:hidden"
              aria-label={unreadCount > 0 ? `Сообщения, ${unreadCount} непрочитанных` : 'Сообщения'}
            >
              <MessageSquare size={20} />
              <UnreadBadge count={unreadCount} className="absolute -right-0.5 -top-0.5" />
            </NavLink>
          ) : null}
          <span className="hidden text-xs text-secondary-foreground sm:inline">{email ?? 'пользователь'}</span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className={cn('md:h-10 md:px-4 md:text-sm', role === 'client' && 'hidden md:inline-flex')}
            onClick={onLogout}
            disabled={logoutPending}
          >
            Выйти
          </Button>
        </div>
      </div>
    </header>
  )
}
