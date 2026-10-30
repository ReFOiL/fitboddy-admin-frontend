import { ArrowLeftRight, Check, ChevronDown, ChevronRight, Lock } from 'lucide-react'
import type { ReactNode } from 'react'

import { weekdayChoiceLabel, weekdaySwapTitle, type WeekdaySlot } from '../../lib/plan-weekday'
import { formatWeekdayShort } from '../../lib/plan-formatters'
import { Button } from '../ui/button'
import { Chip, Sheet } from '../ui/kit'

export function PlanDayChip({
  label,
  active,
  disclosure,
  expanded = false,
  onClick,
}: {
  label: string
  active: boolean
  disclosure: boolean
  expanded?: boolean
  onClick: () => void
}) {
  return (
    <Chip
      active={active}
      aria-expanded={disclosure ? expanded : undefined}
      aria-haspopup={disclosure ? 'dialog' : undefined}
      className={disclosure ? 'gap-1 border-primary bg-primary text-primary-foreground' : undefined}
      onClick={onClick}
    >
      {label}
      {disclosure ? <ChevronDown aria-hidden size={16} /> : null}
    </Chip>
  )
}

function WeekdayMark({ slot }: { slot: WeekdaySlot }) {
  switch (slot.kind) {
    case 'current':
      return (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-hidden>
          <Check size={14} />
        </span>
      )
    case 'free':
      return <ChevronRight aria-hidden size={18} className="text-secondary-foreground" />
    case 'occupied':
      return <Lock aria-hidden size={16} className="text-secondary-foreground" />
    default: {
      const unreachable: never = slot.kind
      return unreachable
    }
  }
}

export function WeekdayMenu({
  slots,
  pending,
  onPick,
}: {
  slots: readonly WeekdaySlot[]
  pending: boolean
  onPick: (slot: WeekdaySlot) => void
}) {
  return (
    <div
      role="dialog"
      aria-label="День недели"
      aria-busy={pending}
      className="relative z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-card shadow-md"
    >
      <ul>
        {slots.map((slot) => (
          <li key={slot.dayOfWeek} className="border-b border-border last:border-b-0">
            <button
              type="button"
              className={`flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left text-[17px] font-semibold ${
                slot.kind === 'current' ? 'bg-primary/10' : 'active:bg-secondary'
              }`}
              aria-label={weekdayChoiceLabel(slot)}
              disabled={pending}
              onClick={() => onPick(slot)}
            >
              <span>{formatWeekdayShort(slot.dayOfWeek)}</span>
              <WeekdayMark slot={slot} />
            </button>
          </li>
        ))}
      </ul>
      <p className="border-t border-border px-4 py-3 text-[13px] leading-snug text-secondary-foreground">
        Занятый день можно поменять местами. Пустые дни останутся на месте.
      </p>
    </div>
  )
}

export function WeekdaySwapSheet({
  fromDayOfWeek,
  toDayOfWeek,
  pending,
  onConfirm,
  onClose,
}: {
  fromDayOfWeek: number
  toDayOfWeek: number
  pending: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const title = weekdaySwapTitle(fromDayOfWeek, toDayOfWeek)
  return (
    <Sheet title="Поменять местами" onClose={onClose}>
      <div className="flex items-center justify-center gap-3 py-1">
        <SwapPill>{formatWeekdayShort(Math.min(fromDayOfWeek, toDayOfWeek))}</SwapPill>
        <ArrowLeftRight aria-hidden className="text-primary" size={22} />
        <SwapPill tone="primary">{formatWeekdayShort(Math.max(fromDayOfWeek, toDayOfWeek))}</SwapPill>
      </div>
      <p className="mt-3 text-center text-[22px] font-bold tracking-tight">{title}</p>
      <p className="mt-2 text-center text-[15px] leading-snug text-secondary-foreground">
        Упражнения и прогресс останутся на своих местах. Поменяется только день недели. Пустые дни останутся на месте.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" className="h-12" onClick={onClose} disabled={pending}>
          Отмена
        </Button>
        <Button type="button" className="h-12" onClick={onConfirm} disabled={pending}>
          {pending ? 'Меняем…' : 'Поменять'}
        </Button>
      </div>
    </Sheet>
  )
}

function SwapPill({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'primary' }) {
  return (
    <span
      className={`inline-flex h-12 min-w-16 items-center justify-center rounded-2xl px-4 text-[17px] font-semibold ${
        tone === 'primary' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
      }`}
    >
      {children}
    </span>
  )
}
