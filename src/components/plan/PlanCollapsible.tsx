import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { cn } from '../../lib/utils'

type PlanCollapsibleProps = {
  title: string
  subtitle?: string
  icon?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}

export function PlanCollapsible({
  title,
  subtitle,
  icon,
  defaultOpen = false,
  children,
  className,
}: PlanCollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={cn('rounded-2xl border border-border/70 bg-card/40', className)}>
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {icon ? <span className="text-primary">{icon}</span> : null}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{title}</span>
          {subtitle ? <span className="mt-0.5 block text-xs text-secondary-foreground">{subtitle}</span> : null}
        </span>
        {open ? <ChevronUp size={18} className="shrink-0 opacity-70" /> : <ChevronDown size={18} className="shrink-0 opacity-70" />}
      </button>
      {open ? <div className="space-y-3 border-t border-border/60 px-4 py-4">{children}</div> : null}
    </div>
  )
}
