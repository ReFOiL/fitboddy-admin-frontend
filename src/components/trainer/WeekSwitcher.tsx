import { ChevronLeft, ChevronRight } from 'lucide-react'

export function WeekSwitcher({
  weeks,
  active,
  range,
  onChange,
}: {
  weeks: number[]
  active: number
  range?: string
  onChange: (week: number) => void
}) {
  const index = weeks.indexOf(active)
  const previous = index > 0 ? weeks[index - 1] : null
  const next = index >= 0 && index < weeks.length - 1 ? weeks[index + 1] : null
  return (
    <div className="flex min-h-12 shrink-0 items-center gap-1 rounded-2xl border border-border bg-card px-1 py-1">
      <button
        type="button"
        aria-label="Предыдущая неделя"
        className="flex h-10 w-10 items-center justify-center rounded-xl disabled:opacity-40"
        disabled={previous == null}
        onClick={() => {
          if (previous != null) onChange(previous)
        }}
      >
        <ChevronLeft aria-hidden size={18} />
      </button>
      <span className="min-w-0 flex-1 text-center text-[15px] font-bold leading-tight">
        Неделя {active}
        {range ? <span className="mt-0.5 block text-[13px] font-semibold text-secondary-foreground">{range}</span> : null}
      </span>
      <button
        type="button"
        aria-label="Следующая неделя"
        className="flex h-10 w-10 items-center justify-center rounded-xl disabled:opacity-40"
        disabled={next == null}
        onClick={() => {
          if (next != null) onChange(next)
        }}
      >
        <ChevronRight aria-hidden size={18} />
      </button>
    </div>
  )
}
