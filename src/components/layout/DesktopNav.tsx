import { Link, useLocation } from 'react-router-dom'

import { APP_PATHS, getNavItems, type AppRole } from '../../config'
import { isNavItemActive } from '../../lib/navigation'
import { cn } from '../../lib/utils'
import { UnreadBadge } from '../shared'

type DesktopNavProps = {
  role: AppRole
  unreadCount: number
}

export function DesktopNav({ role, unreadCount }: DesktopNavProps) {
  const location = useLocation()
  const items = getNavItems(role, 'desktop')

  return (
    <nav aria-label="Основная навигация" className="hidden items-center gap-6 text-[17px] md:flex">
      {items.map((item) => {
        const active = isNavItemActive(item, location.pathname)
        const isMessages = item.path === APP_PATHS.messages
        return (
          <Link
            key={item.id}
            aria-current={active ? 'page' : undefined}
            aria-label={isMessages && unreadCount > 0 ? `${item.label}, ${unreadCount} непрочитанных` : item.label}
            className={cn(
              'border-b-2 py-4 font-semibold',
              active ? 'border-primary text-foreground' : 'border-transparent text-foreground',
            )}
            to={item.path}
          >
            {item.label}
            {isMessages ? <UnreadBadge count={unreadCount} className="ml-2" /> : null}
          </Link>
        )
      })}
    </nav>
  )
}
