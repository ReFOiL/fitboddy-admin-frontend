import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '../../lib/utils'

type AlertTone = 'info' | 'success' | 'warning' | 'destructive'

type AlertBannerProps = HTMLAttributes<HTMLDivElement> & {
  title?: string
  icon?: ReactNode
  tone?: AlertTone
}

const toneClasses: Record<AlertTone, string> = {
  info: 'border-info/40 bg-info/10 text-info',
  success: 'border-success/40 bg-success/10 text-success',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  destructive: 'border-destructive/40 bg-destructive/10 text-destructive',
}

export function AlertBanner({
  title,
  icon,
  tone = 'info',
  className,
  children,
  role = 'status',
  ...props
}: AlertBannerProps) {
  return (
    <div
      className={cn('flex gap-3 rounded-xl border px-4 py-3 text-sm', toneClasses[tone], className)}
      role={role}
      {...props}
    >
      {icon ? <span className="mt-0.5 shrink-0" aria-hidden="true">{icon}</span> : null}
      <div className="min-w-0">
        {title ? <div className="font-semibold">{title}</div> : null}
        {children ? <div className={cn(title && 'mt-1', 'text-foreground')}>{children}</div> : null}
      </div>
    </div>
  )
}
