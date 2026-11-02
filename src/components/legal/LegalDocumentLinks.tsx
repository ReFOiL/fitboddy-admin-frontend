import type { MouseEventHandler, ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { APP_PATHS } from '../../config'
import { cn } from '../../lib/utils'

const legalLinkClass =
  'rounded-sm text-accent-ink underline decoration-border underline-offset-4 hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus'

export function LegalDocLink({
  to,
  children,
  className,
  onClick,
}: {
  to: string
  children: ReactNode
  className?: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
}) {
  return (
    <Link to={to} className={cn(legalLinkClass, className)} onClick={onClick}>
      {children}
    </Link>
  )
}

export function LegalDocumentLinks({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Документы"
      className={cn('flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-secondary-foreground', className)}
    >
      <LegalDocLink to={APP_PATHS.privacy}>Политика обработки персональных данных</LegalDocLink>
      <span aria-hidden="true">·</span>
      <LegalDocLink to={APP_PATHS.terms}>Пользовательское соглашение</LegalDocLink>
    </nav>
  )
}
