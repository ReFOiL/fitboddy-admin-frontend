import { Link, useLocation } from 'react-router-dom'

import { APP_BRAND_NAME, APP_PATHS, type AppRole } from '../../config'
import { isWideTrainerPath } from '../../lib/wide-canvas'
import { messageCountLabel } from '../../lib/dates'
import { firstName } from '../../lib/person'
import { BrandLogo } from '../brand/BrandLogo'
import { AccountMenu } from './AccountMenu'
import { DesktopNav } from './DesktopNav'

type AppHeaderProps = {
  role: AppRole
  displayName: string
  unreadCount: number
  logoutPending: boolean
  onLogout: () => void
  hiddenOnMobile?: boolean
}

export function AppHeader({
  role,
  displayName,
  unreadCount,
  logoutPending,
  onLogout,
  hiddenOnMobile = false,
}: AppHeaderProps) {
  const location = useLocation()
  const isTrainer = role === 'trainer'
  const name = firstName(displayName) || 'Профиль'
  const wideCanvas = isWideTrainerPath(location.pathname)

  return (
    <header
      className={`sticky top-0 z-20 shrink-0 border-b border-border bg-card ${hiddenOnMobile ? 'hidden md:block' : ''}`}
    >
      <div className={`mx-auto flex h-14 w-full items-center gap-4 px-4 md:h-16 ${wideCanvas ? 'max-w-[1440px] md:px-8' : 'max-w-6xl md:px-6'}`}>
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
          {isTrainer ? (
            <Link to={APP_PATHS.profile} className="inline-flex h-12 items-center text-[15px] font-semibold">
              {name}
            </Link>
          ) : (
            <AccountMenu name={displayName} logoutPending={logoutPending} onLogout={onLogout} />
          )}
        </div>
      </div>
    </header>
  )
}
