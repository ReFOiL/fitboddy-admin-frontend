import { ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { cn } from '../../lib/utils'

type ExerciseAccordionProps = {
  title: string
  summary?: string
  defaultOpen?: boolean
  /** Раскрыть секцию, если в ней ошибка валидации. */
  forceOpen?: boolean
  children: ReactNode
}

export function ExerciseAccordion({ title, summary, defaultOpen = false, forceOpen = false, children }: ExerciseAccordionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const shown = open || forceOpen

  return (
    <section className="rounded-2xl border border-border bg-card">
      <button
        type="button"
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={shown}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="min-w-0">
          <span className="block text-[17px] font-semibold">{title}</span>
          {!shown && summary ? <span className="mt-0.5 block truncate text-[13px] text-secondary-foreground">{summary}</span> : null}
        </span>
        <ChevronDown size={18} className={cn('shrink-0 text-secondary-foreground transition', shown && 'rotate-180')} aria-hidden />
      </button>
      {shown ? <div className="grid gap-4 border-t border-border px-4 py-4">{children}</div> : null}
    </section>
  )
}
