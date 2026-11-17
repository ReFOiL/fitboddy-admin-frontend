import { GripVertical } from 'lucide-react'
import { useRef, type ReactNode } from 'react'

import { formatDayMonth } from '../../lib/dates'
import { formatDosage, moveDraftSlot, type DayDraft, type DraftSlot } from '../../lib/plan-draft'
import { formatWeekday } from '../../lib/plan-formatters'
import { dayFocusLabel } from '../../lib/plan-studio-view'
import { EXERCISE_FORMS, pluralPhrase } from '../../lib/plural'
import { cn } from '../../lib/utils'
import type { TrainerExercise } from '../../types/exercise'
import { ExerciseThumb } from '../ui/kit'
import { ExerciseDoseEditor } from './ExerciseDoseEditor'

type StudioDayPanelProps = {
  day: DayDraft | null
  readOnly: boolean
  wide: boolean
  media: Map<string, TrainerExercise>
  lineKey: string | null
  startControl: ReactNode
  timeControl: ReactNode
  onToggleLine: (key: string) => void
  onChangeSlot: (next: DraftSlot) => void
  onDeleteSlot: (key: string) => void
  onReorder: (slots: DraftSlot[]) => void
  onAdd: () => void
}

function clockLabel(value: string | null): string {
  if (!value) return ''
  return value.slice(0, 5)
}

export function StudioDayPanel({
  day,
  readOnly,
  wide,
  media,
  lineKey,
  startControl,
  timeControl,
  onToggleLine,
  onChangeSlot,
  onDeleteSlot,
  onReorder,
  onAdd,
}: StudioDayPanelProps) {
  if (!day) return null
  const focus = dayFocusLabel(day.slots.map((slot) => slot.category))
  const title = `${formatWeekday(day.dayOfWeek)}, ${formatDayMonth(day.scheduledFor, 'long')}${focus ? ` · ${focus}` : ''}`
  const countLabel =
    day.slots.length === 0
      ? 'Пока нет упражнений'
      : readOnly
        ? pluralPhrase(day.slots.length, EXERCISE_FORMS)
        : `${pluralPhrase(day.slots.length, EXERCISE_FORMS)} · можно менять порядок и дозировку`
  const time = clockLabel(day.scheduledTime)
  return (
    <section
      aria-label={title}
      className={cn('min-w-0', wide && 'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card')}
    >
      <div className={cn('min-w-0', wide && 'flex items-start gap-3 border-b border-border px-5 py-4')}>
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-bold leading-snug">{title}</h2>
          <p className={cn('text-secondary-foreground', wide ? 'mt-0.5 text-[15px]' : 'mt-0.5 text-[13px] font-semibold')}>
            {wide ? countLabel : pluralPhrase(day.slots.length, EXERCISE_FORMS)}
          </p>
        </div>
        {wide ? (
          timeControl ??
          (time ? <p className="shrink-0 text-[15px] font-semibold text-secondary-foreground">{time}</p> : null)
        ) : null}
      </div>

      {readOnly ? (
        <p className={cn('text-[15px] text-secondary-foreground', wide ? 'px-5 pt-3' : 'mt-3')}>
          Этот план нельзя править по слотам. Собрать новый можно из меню.
        </p>
      ) : null}

      {!wide ? (
        <div className="mt-1.5 flex items-center justify-between gap-2">
          {startControl}
          {timeControl}
        </div>
      ) : null}

      <div className={cn(wide ? 'min-h-0 flex-1 overflow-y-auto px-2 py-1' : 'mt-2')}>
        {day.slots.map((slot, index) => {
          const exercise = media.get(slot.exerciseId)
          const expanded = !readOnly && lineKey === slot.key
          return (
            <ExerciseRow
              key={slot.key}
              slot={slot}
              index={index}
              expanded={expanded}
              readOnly={readOnly}
              imageUrl={exercise?.start_image_url}
              hasVideo={Boolean(exercise?.video_url)}
              onToggle={() => onToggleLine(slot.key)}
              onChange={onChangeSlot}
              onDelete={() => onDeleteSlot(slot.key)}
              onReorder={(from, to) => onReorder(moveDraftSlot(day.slots, from, to))}
            />
          )
        })}
      </div>

      {!readOnly ? (
        <button
          type="button"
          className={cn(
            'border border-dashed border-primary/50 bg-secondary/60 font-semibold',
            wide
              ? 'mx-2 mb-2 mt-1 h-12 rounded-2xl text-[17px]'
              : 'mt-2 h-11 w-full rounded-2xl text-[15px]',
          )}
          onClick={onAdd}
        >
          + Упражнение из каталога
        </button>
      ) : null}
    </section>
  )
}

function ExerciseRow({
  slot,
  index,
  expanded,
  readOnly,
  imageUrl,
  hasVideo,
  onToggle,
  onChange,
  onDelete,
  onReorder,
}: {
  slot: DraftSlot
  index: number
  expanded: boolean
  readOnly: boolean
  imageUrl?: string | null
  hasVideo: boolean
  onToggle: () => void
  onChange: (next: DraftSlot) => void
  onDelete: () => void
  onReorder: (from: number, to: number) => void
}) {
  const dragFrom = useRef<number | null>(null)
  const dragOver = useRef(index)
  const dose = formatDosage(slot)
  return (
    <article
      data-slot-index={index}
      className={cn(
        'grid grid-cols-[16px_64px_minmax(0,1fr)] items-center gap-2 rounded-[14px] px-1 py-1 lg:grid-cols-[20px_72px_minmax(0,1fr)] lg:gap-3 lg:px-3 lg:py-2.5',
        expanded && 'items-start border border-primary/30 bg-primary/10 px-2 py-1.5 lg:px-3 lg:py-2.5',
      )}
    >
      <button
        type="button"
        aria-label="Перетащить упражнение"
        disabled={readOnly}
        className="flex h-12 items-center justify-center text-secondary-foreground/70 touch-none disabled:opacity-40 lg:h-[54px]"
        onPointerDown={(event) => {
          if (readOnly) return
          dragFrom.current = index
          dragOver.current = index
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          if (dragFrom.current == null) return
          const node = document.elementFromPoint(event.clientX, event.clientY)
          const row = node?.closest('[data-slot-index]')
          const next = row ? Number(row.getAttribute('data-slot-index')) : Number.NaN
          if (Number.isInteger(next)) dragOver.current = next
        }}
        onPointerUp={() => {
          const from = dragFrom.current
          dragFrom.current = null
          if (from == null) return
          onReorder(from, dragOver.current)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            onReorder(index, index - 1)
          } else if (event.key === 'ArrowDown') {
            event.preventDefault()
            onReorder(index, index + 1)
          }
        }}
      >
        <GripVertical aria-hidden size={16} />
      </button>
      <ExerciseThumb
        imageUrl={imageUrl}
        hasVideo={hasVideo}
        className="h-12 w-16 rounded-lg lg:h-[54px] lg:w-[72px] lg:rounded-[10px]"
      />
      <div className="min-w-0">
        {readOnly ? (
          <div>
            <div className="truncate text-[15px] font-semibold leading-tight lg:text-[17px]">{slot.exerciseName}</div>
            <div className="truncate text-[13px] text-secondary-foreground lg:text-[15px]">{dose}</div>
          </div>
        ) : (
          <button type="button" className="block w-full min-w-0 text-left" onClick={onToggle}>
            <span className="block truncate text-[15px] font-semibold leading-tight lg:text-[17px]">{slot.exerciseName}</span>
            <span className="block truncate text-[13px] text-secondary-foreground lg:text-[15px]">{dose}</span>
          </button>
        )}
        {expanded ? <ExerciseDoseEditor slot={slot} onChange={onChange} onDelete={onDelete} /> : null}
      </div>
    </article>
  )
}
