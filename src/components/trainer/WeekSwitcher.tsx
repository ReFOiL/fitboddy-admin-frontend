import { ChevronLeft, ChevronRight } from 'lucide-react'

export function WeekSwitcher({
  weeks,
  active,
  onChange,
}: {
  weeks: number[]
  active: number
  onChange: (week: number) => void
}) {
  const index = weeks.indexOf(active)
  const previous = index > 0 ? weeks[index - 1] : null
  const next = index >= 0 && index < weeks.length - 1 ? weeks[index + 1] : null
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        aria-label="Предыдущая неделя"
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card disabled:opacity-40"
        disabled={previous == null}
        onClick={() => {
          if (previous != null) onChange(previous)
        }}
      >
        <ChevronLeft aria-hidden size={18} />
      </button>
      <span className="min-w-20 text-center text-[15px] font-semibold">Неделя {active}</span>
      <button
        type="button"
        aria-label="Следующая неделя"
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card disabled:opacity-40"
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
