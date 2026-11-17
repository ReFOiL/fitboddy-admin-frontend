import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { formatDayMonth } from '../../lib/dates'
import type { DayDraft } from '../../lib/plan-draft'
import { formatWeekdayShort } from '../../lib/plan-formatters'
import {
  dayFocusLabel,
  dayMarkKind,
  dayMarkLabel,
  exerciseCountShort,
  missedWeekLabel,
  weekRangeLabel,
  type DayMarkKind,
} from '../../lib/plan-studio-view'
import { isEmptyLeadInDay, isSkippedWorkout } from '../../lib/plan-start'
import { cn } from '../../lib/utils'
import { WeekSwitcher } from './WeekSwitcher'

type StudioScheduleProps = {
  weeks: number[]
  days: DayDraft[]
  activeWeek: number
  openWeeks: number[]
  selectedDayId: string | null
  todayIso: string
  /** Скрывает пустые дни до выбранного старта. */
  leadInStart: string | null
  /** Пропуски считаются от даты плана, а не от несохранённого «Когда начать». */
  planStart: string | null
  canEdit: boolean
  wide: boolean
  weekdayOpen: boolean
  onSelectWeek: (week: number) => void
  onToggleWeek: (week: number) => void
  onDayClick: (day: DayDraft) => void
  onAddDay: () => void
  weekdayMenu: ReactNode
}

function daysOfWeek(days: DayDraft[], week: number, startIso: string | null): DayDraft[] {
  const inWeek = days.filter((day) => day.week === week)
  const shown = inWeek.filter(
    (day) =>
      !isEmptyLeadInDay(
        { week: day.week, scheduledFor: day.scheduledFor, exerciseCount: day.slots.length },
        startIso,
      ),
  )
  return shown.length > 0 ? shown : inWeek
}

function missedInWeek(days: DayDraft[], week: number, todayIso: string, startIso: string | null): number {
  return days.filter(
    (day) =>
      day.week === week &&
      isSkippedWorkout(
        {
          week: day.week,
          scheduledFor: day.scheduledFor,
          exerciseCount: day.slots.length,
          isCompleted: day.isCompleted,
        },
        todayIso,
        startIso,
      ),
  ).length
}

export function StudioSchedule({
  weeks,
  days,
  activeWeek,
  openWeeks,
  selectedDayId,
  todayIso,
  leadInStart,
  planStart,
  canEdit,
  wide,
  weekdayOpen,
  onSelectWeek,
  onToggleWeek,
  onDayClick,
  onAddDay,
  weekdayMenu,
}: StudioScheduleProps) {
  const activeDays = daysOfWeek(days, activeWeek, leadInStart)
  const activeRange = weekRangeLabel(activeDays[0]?.scheduledFor ?? days.find((day) => day.week === activeWeek)?.scheduledFor)
  if (!wide) {
    return (
      <div>
        <WeekSwitcher weeks={weeks} active={activeWeek} range={activeRange} onChange={onSelectWeek} />
        <p id="weekday-chip-hint" className="sr-only">
          Сменить день недели
        </p>
        <div className="mt-2 flex gap-2" aria-label="Дни недели">
          {activeDays.map((day) => (
            <DayChip
              key={day.dayId}
              day={day}
              selected={day.dayId === selectedDayId}
              weekdayOpen={weekdayOpen}
              canEdit={canEdit}
              todayIso={todayIso}
              startIso={planStart}
              onClick={() => onDayClick(day)}
            />
          ))}
          {canEdit ? (
            <button
              type="button"
              aria-label="Добавить день"
              title="Добавить день"
              className="flex h-16 w-12 shrink-0 items-center justify-center rounded-2xl border border-dashed border-primary/50 bg-secondary text-[22px] font-semibold"
              onClick={onAddDay}
            >
              +
            </button>
          ) : null}
        </div>
        {weekdayMenu}
      </div>
    )
  }

  return (
    <aside aria-label="Недели и дни плана" className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <p id="weekday-chip-hint" className="sr-only">
        Сменить день недели
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {weeks.map((week) => {
          const weekDays = daysOfWeek(days, week, leadInStart)
          const open = openWeeks.includes(week)
          const range = weekRangeLabel(weekDays[0]?.scheduledFor)
          const missed = missedWeekLabel(missedInWeek(days, week, todayIso, planStart))
          return (
            <div key={week} className="mt-1 first:mt-0">
              <button
                type="button"
                aria-expanded={open}
                aria-label={`Неделя ${week}`}
                className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[15px] font-bold"
                onClick={() => onToggleWeek(week)}
              >
                <span className="min-w-0">
                  Неделя {week}
                  {range ? <span className="font-semibold text-secondary-foreground"> · {range}</span> : null}
                </span>
                {missed ? <span className="text-[12px] font-semibold text-destructive">{missed}</span> : null}
                <span className="ml-auto text-secondary-foreground" aria-hidden>
                  {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
              </button>
              {open ? (
                <div className="px-1 pb-1">
                  {weekDays.map((day) => (
                    <DayRow
                      key={day.dayId}
                      day={day}
                      selected={day.dayId === selectedDayId}
                      weekdayOpen={weekdayOpen && day.dayId === selectedDayId}
                      canEdit={canEdit}
                      todayIso={todayIso}
                      startIso={planStart}
                      onClick={() => onDayClick(day)}
                    />
                  ))}
                  {canEdit && week === activeWeek ? (
                    <button
                      type="button"
                      aria-label="Добавить день"
                      className="mt-2 flex h-11 w-full items-center justify-center rounded-full border border-dashed border-primary/50 bg-secondary text-[15px] font-semibold"
                      onClick={onAddDay}
                    >
                      + День
                    </button>
                  ) : null}
                  {week === activeWeek ? weekdayMenu : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </aside>
  )
}

function DayMark({ kind }: { kind: DayMarkKind }) {
  if (kind === 'done') {
    return (
      <span aria-hidden className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-success text-white">
        <Check size={10} strokeWidth={3} />
      </span>
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex h-4 w-4 rounded-full border-[1.5px] bg-card',
        kind === 'today' && 'border-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_18%,transparent)]',
        kind === 'missed' && 'border-destructive bg-destructive',
        kind === 'upcoming' && 'border-primary/45',
      )}
    />
  )
}

function dayButtonProps(day: DayDraft, selected: boolean, weekdayOpen: boolean, canEdit: boolean, todayIso: string, startIso: string | null) {
  const kind = dayMarkKind({
    scheduledFor: day.scheduledFor,
    isCompleted: day.isCompleted,
    exerciseCount: day.slots.length,
    week: day.week,
    todayIso,
    startIso,
  })
  const disclosure = selected && canEdit
  return {
    kind,
    label: formatWeekdayShort(day.dayOfWeek),
    props: {
      type: 'button' as const,
      'aria-label': formatWeekdayShort(day.dayOfWeek),
      'aria-current': selected ? ('true' as const) : undefined,
      'aria-expanded': disclosure ? weekdayOpen : undefined,
      'aria-haspopup': disclosure ? ('dialog' as const) : undefined,
      'aria-describedby': disclosure ? 'weekday-chip-hint' : undefined,
      title: disclosure ? 'Сменить день недели' : `${formatWeekdayShort(day.dayOfWeek)}, ${dayMarkLabel(kind)}`,
    },
  }
}

function DayChip({
  day,
  selected,
  weekdayOpen,
  canEdit,
  todayIso,
  startIso,
  onClick,
}: {
  day: DayDraft
  selected: boolean
  weekdayOpen: boolean
  canEdit: boolean
  todayIso: string
  startIso: string | null
  onClick: () => void
}) {
  const { kind, label, props } = dayButtonProps(day, selected, weekdayOpen, canEdit, todayIso, startIso)
  const dayNumber = day.scheduledFor.slice(8, 10).replace(/^0/, '')
  return (
    <button
      {...props}
      onClick={onClick}
      className={cn(
        'flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl border bg-card px-1',
        selected ? 'border-primary/40 bg-primary/10' : 'border-transparent',
      )}
    >
      <DayMark kind={kind} />
      <span className="text-[15px] font-bold leading-none">{label}</span>
      <span className={cn('text-[13px] font-semibold leading-none', selected ? 'text-accent-ink' : 'text-secondary-foreground')}>
        {dayNumber}
      </span>
    </button>
  )
}

function DayRow({
  day,
  selected,
  weekdayOpen,
  canEdit,
  todayIso,
  startIso,
  onClick,
}: {
  day: DayDraft
  selected: boolean
  weekdayOpen: boolean
  canEdit: boolean
  todayIso: string
  startIso: string | null
  onClick: () => void
}) {
  const { kind, props } = dayButtonProps(day, selected, weekdayOpen, canEdit, todayIso, startIso)
  const focus = dayFocusLabel(day.slots.map((slot) => slot.category))
  const subtitle = [focus, exerciseCountShort(day.slots.length)].filter(Boolean).join(' · ')
  return (
    <button
      {...props}
      onClick={onClick}
      className={cn(
        'grid w-full grid-cols-[18px_minmax(0,1fr)] items-start gap-2.5 rounded-xl border px-2.5 py-2.5 text-left',
        selected ? 'border-primary/40 bg-primary/10' : 'border-transparent',
        !selected && kind === 'today' && 'bg-primary/5',
      )}
    >
      <DayMark kind={kind} />
      <span className="min-w-0">
        <span className="block text-[15px] font-bold leading-tight">
          {formatWeekdayShort(day.dayOfWeek)}, {formatDayMonth(day.scheduledFor, 'short')}
        </span>
        <span className="mt-0.5 block text-[13px] text-secondary-foreground">{subtitle}</span>
      </span>
    </button>
  )
}
