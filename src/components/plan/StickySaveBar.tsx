import type { ReactNode } from 'react'

import { cn } from '../../lib/utils'

type StickySaveBarProps = {
  children: ReactNode
  className?: string
  /** When set, the bar is exposed as a labelled landmark region. */
  ariaLabel?: string
}

/**
 * Mobile save bar sits above MobileTabBar (z-30, 4.25rem + safe area).
 * From md and up it returns to normal document flow.
 */
export function StickySaveBar({ children, className, ariaLabel }: StickySaveBarProps) {
  return (
    <div
      role={ariaLabel ? 'region' : undefined}
      aria-label={ariaLabel}
      className={cn(
        'fixed inset-x-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur',
        'bottom-[calc(4.25rem+env(safe-area-inset-bottom))]',
        'md:static md:inset-x-auto md:bottom-auto md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none',
        className,
      )}
    >
      {children}
    </div>
  )
}
