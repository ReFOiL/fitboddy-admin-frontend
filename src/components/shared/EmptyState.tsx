import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '../../lib/utils'

type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  title: string
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
}

export function EmptyState({ title, description, icon, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-10 text-center',
        className,
      )}
      {...props}
    >
      {icon ? <div className="mb-3 text-info" aria-hidden="true">{icon}</div> : null}
      <h3 className="font-semibold text-foreground">{title}</h3>
      {description ? <div className="mt-1 max-w-md text-sm text-secondary-foreground">{description}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
