import { Link } from 'react-router-dom'

import { APP_BRAND_NAME, APP_PATHS, type AppRole } from '../../config'
import { messageCountLabel } from '../../lib/dates'
import { BrandLogo } from '../brand/BrandLogo'
import { AccountMenu } from './AccountMenu'
import { DesktopNav } from './DesktopNav'
import { ThemeToggle } from './ThemeToggle'

type AppHeaderProps = {
  role: AppRole
  displayName: string
  unreadCount: number
  logoutPending: boolean
  onLogout: () => void
  hiddenOnMobile?: boolean
  published?: boolean
  publicationPending?: boolean
  onTogglePublication?: () => void
}

export function AppHeader({
  role,
  displayName,
  unreadCount,
  logoutPending,
  onLogout,
  hiddenOnMobile = false,
  published,
  publicationPending,
  onTogglePublication,
}: AppHeaderProps) {
  const isTrainer = role === 'trainer'

  return (
    <header
      className={`sticky top-0 z-20 shrink-0 border-b border-border bg-card ${hiddenOnMobile ? 'hidden md:block' : ''}`}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4 md:h-16 md:px-6">
        <Link
          to={APP_PATHS.home}
          aria-label={APP_BRAND_NAME}
          className="inline-flex shrink-0 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          {/* Узкая шапка: знак F. С md — слово целиком, светлое или тёмное по теме. */}
          <BrandLogo compact alt="" className="h-8 md:hidden" />
          <BrandLogo alt="" className="hidden h-9 md:block" />
        </Link>
        <DesktopNav role={role} unreadCount={unreadCount} />
        <div className="ml-auto flex items-center gap-3">
          {isTrainer && unreadCount > 0 ? (
            <Link to={APP_PATHS.messages} className="text-[15px] underline md:hidden">
              {messageCountLabel(unreadCount)}
            </Link>
          ) : null}
          <ThemeToggle />
          <AccountMenu
            role={role}
            name={displayName}
            logoutPending={logoutPending}
            onLogout={onLogout}
            published={published}
            publicationPending={publicationPending}
            onTogglePublication={onTogglePublication}
          />
        </div>
      </div>
    </header>
  )
}
