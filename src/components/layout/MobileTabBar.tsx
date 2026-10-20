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
        'fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden',
        hidden ? 'hidden' : 'block',
      )}
    >
      <div
        className="mx-auto grid h-[4.25rem] w-full max-w-6xl items-end px-1"
        style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}
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
              className="flex h-full min-h-12 flex-col items-center justify-end pb-2 text-[12px] font-medium"
            >
              <span className={cn('mb-1 h-0.5 w-8 rounded-full', active ? 'bg-primary' : 'bg-transparent')} />
              <span className="relative">
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                {isMessages ? <UnreadBadge count={unreadCount} className="absolute -right-3 -top-2" /> : null}
              </span>
              <span className="mt-0.5">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
