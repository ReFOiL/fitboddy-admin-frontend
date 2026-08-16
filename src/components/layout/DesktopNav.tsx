import { Link, useLocation } from 'react-router-dom'

import { APP_PATHS, getNavItems, type AppRole } from '../../config'
import { isNavItemActive } from '../../lib/navigation'
import { UnreadBadge } from '../shared'

type DesktopNavProps = {
  role: AppRole
  unreadCount: number
}

export function DesktopNav({ role, unreadCount }: DesktopNavProps) {
  const location = useLocation()
  const items = getNavItems(role, 'desktop')

  return (
    <nav aria-label="Основная навигация" className="hidden items-center gap-2 text-sm md:flex">
      {items.map((item) => {
        const active = isNavItemActive(item, location.pathname)
        const isMessages = item.path === APP_PATHS.messages

        return (
          <Link
            key={item.id}
            aria-current={active ? 'page' : undefined}
            aria-label={isMessages && unreadCount > 0 ? `${item.label}, ${unreadCount} непрочитанных` : item.label}
            className={`rounded-lg px-3 py-2 font-medium transition ${
              active
                ? 'bg-primary/20 text-foreground'
                : 'text-secondary-foreground hover:bg-secondary/70 hover:text-foreground'
            }`}
            to={item.path}
          >
            {item.label}
            {isMessages ? <UnreadBadge count={unreadCount} className="ml-2 min-w-5 px-1.5" /> : null}
          </Link>
        )
      })}
    </nav>
  )
}
