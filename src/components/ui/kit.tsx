import { Check, ChevronLeft, ChevronRight, Minus, Plus, X } from 'lucide-react'
import { useEffect, useId, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { personInitials } from '../../lib/person'
import { cn } from '../../lib/utils'
import { ThemeToggle } from '../layout/ThemeToggle'

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-[28px] font-bold leading-tight">{children}</h1>
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="px-1 text-[13px] font-bold uppercase tracking-wide">{children}</h2>
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-[15px] font-semibold text-accent-ink',
        className,
      )}
    >
      {personInitials(name)}
    </span>
  )
}

export function StatusPill({ tone, children }: { tone: 'danger' | 'neutral'; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 items-center rounded-full border px-3 text-[13px] font-semibold',
        tone === 'danger' ? 'border-destructive text-destructive' : 'border-border bg-secondary text-foreground',
      )}
    >
      {children}
    </span>
  )
}

type RowProps = {
  title: string
  subtitle?: string
  leading?: ReactNode
  trailing?: ReactNode
  href?: string
  onClick?: () => void
  titleAdornment?: ReactNode
}

export function Row({ title, subtitle, leading, trailing, href, onClick, titleAdornment }: RowProps) {
  const className =
    'flex min-h-16 w-full items-center gap-3 border-b border-border px-1 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus'
  const body = (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[17px] font-semibold leading-tight">
          <span className="truncate">{title}</span>
          {titleAdornment}
        </span>
        {subtitle ? <span className="mt-0.5 block truncate text-[15px] text-secondary-foreground">{subtitle}</span> : null}
      </span>
      {trailing}
      {href || onClick ? <ChevronRight size={18} aria-hidden className="shrink-0" /> : null}
    </>
  )
  if (href) {
    return (
      <Link to={href} className={className}>
        {body}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    )
  }
  return <div className={className}>{body}</div>
}

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }

export function Chip({ active = false, className, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-12 items-center rounded-full border px-4 text-[15px] font-semibold',
        active ? 'border-primary bg-card text-foreground' : 'border-transparent bg-secondary text-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  formatValue,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (next: number) => void
  formatValue?: (value: number) => string
}) {
  const decrease = () => onChange(roundStep(Math.max(min, value - step), step))
  const increase = () => onChange(roundStep(Math.min(max, value + step), step))
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-[17px] font-semibold">{label}</span>
      <div className="grid h-14 w-[210px] grid-cols-3 overflow-hidden rounded-2xl border border-border bg-card">
        <button type="button" className="flex items-center justify-center" aria-label={`Меньше: ${label}`} onClick={decrease}>
          <Minus size={18} />
        </button>
        <span className="flex items-center justify-center border-x border-border text-[17px] font-semibold">
          {formatValue ? formatValue(value) : value}
        </span>
        <button type="button" className="flex items-center justify-center" aria-label={`Больше: ${label}`} onClick={increase}>
          <Plus size={18} />
        </button>
      </div>
    </div>
  )
}

function roundStep(value: number, step: number): number {
  // Шаг 2.5 кг не должен схлопываться до целого: 40 + 2.5 = 42.5, а не 43.
  const decimals = Number.isInteger(step) ? 0 : 1
  return Number(value.toFixed(decimals))
}

export function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-card px-4 py-3 md:static md:border-0 md:bg-transparent md:px-0 md:py-0">
      <div className="mx-auto w-full max-w-lg md:max-w-none">{children}</div>
    </div>
  )
}

export function ScreenHeader({
  title,
  onBack,
  backLabel = 'Назад',
  menu,
}: {
  title: string
  onBack?: () => void
  backLabel?: string
  menu?: ReactNode
}) {
  return (
    <div className="grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 border-b border-border">
      {onBack ? (
        <button type="button" onClick={onBack} aria-label={backLabel} className="flex h-12 w-12 items-center justify-center">
          <ChevronLeft size={22} />
        </button>
      ) : (
        <span className="w-12" />
      )}
      <h1 className="truncate text-center text-[17px] font-bold">{title}</h1>
      <span className="flex items-center justify-end">
        <ThemeToggle className="md:hidden" />
        {menu ?? <span className="hidden w-12 md:block" />}
      </span>
    </div>
  )
}

export type OverflowItem = {
  id: string
  label: string
  hint?: string
  hintTone?: 'danger' | 'muted'
  onSelect: () => void
}

export function OverflowMenu({ items, label = 'Ещё' }: { items: OverflowItem[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className="flex h-12 w-12 items-center justify-center text-[22px] leading-none"
        onClick={() => setOpen(true)}
      >
        ⋯
      </button>
      {open ? (
        <div className="fixed inset-0 z-40" role="presentation" onClick={() => setOpen(false)}>
          <div
            role="menu"
            aria-labelledby={titleId}
            className="absolute right-4 top-16 w-[min(100%-2rem,320px)] overflow-hidden rounded-2xl border border-border bg-card shadow-lg md:top-20"
            onClick={(event) => event.stopPropagation()}
          >
            <span id={titleId} className="sr-only">
              {label}
            </span>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className="flex min-h-14 w-full flex-col items-start justify-center border-b border-border px-4 py-2 text-left last:border-b-0"
                onClick={() => {
                  setOpen(false)
                  item.onSelect()
                }}
              >
                <span className="text-[17px] font-semibold">{item.label}</span>
                {item.hint ? (
                  <span className={cn('text-[13px]', item.hintTone === 'danger' ? 'text-destructive' : 'text-secondary-foreground')}>
                    {item.hint}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  )
}

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-overlay md:items-center" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg rounded-t-3xl border border-border bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[22px] font-bold">{title}</h2>
          <button type="button" aria-label="Закрыть" className="flex h-12 w-12 items-center justify-center" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function DoneMark() {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground" aria-hidden>
      <Check size={16} />
    </span>
  )
}

export function ExerciseThumb({ imageUrl, hasVideo }: { imageUrl?: string | null; hasVideo?: boolean }) {
  return (
    <span className="photo-placeholder relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg">
      {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : null}
      {hasVideo ? (
        <span className="absolute flex h-6 w-6 items-center justify-center rounded-full bg-media text-media-foreground">
          <span className="ml-0.5 border-y-[5px] border-l-[8px] border-y-transparent border-l-media-foreground" />
        </span>
      ) : null}
    </span>
  )
}
