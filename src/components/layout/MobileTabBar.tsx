import { Link, useLocation } from 'react-router-dom'

import { APP_PATHS, getNavItems, type AppRole } from '../../config'
import { isNavItemActive } from '../../lib/navigation'
import { cn } from '../../lib/utils'
import { UnreadBadge } from '../shared'

type MobileTabBarProps = {
  role: AppRole
  unreadCount: number
  hidden?: boolean
}

export function MobileTabBar({ role, unreadCount, hidden = false }: MobileTabBarProps) {
  const location = useLocation()
  const items = getNavItems(role, 'mobile')

  return (
    <nav
      aria-label="Мобильная навигация"
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden',
        hidden ? 'hidden' : 'block',
      )}
    >
      <div
        className="mx-auto grid h-[4.25rem] w-full max-w-6xl items-center px-1"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const active = isNavItemActive(item, location.pathname)
          const label = item.mobileLabel ?? item.label
          const Icon = item.icon
          const isMessages = item.path === APP_PATHS.messages

          return (
            <Link
              key={item.id}
              to={item.path}
              aria-current={active ? 'page' : undefined}
              aria-label={isMessages && unreadCount > 0 ? `${label}, ${unreadCount} непрочитанных` : label}
              className={cn(
                'flex h-full min-h-12 items-center justify-center rounded-lg px-1 text-[11px] font-medium transition',
                active ? 'bg-primary/20 text-foreground' : 'text-secondary-foreground',
              )}
            >
              <span className="relative mx-auto flex flex-col items-center gap-0.5">
                <span className="relative">
                  <Icon size={18} />
                  {isMessages ? <UnreadBadge count={unreadCount} className="absolute -right-2.5 -top-1.5" /> : null}
                </span>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
