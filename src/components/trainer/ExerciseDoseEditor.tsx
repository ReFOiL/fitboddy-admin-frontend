import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import type { DraftSlot } from '../../lib/plan-draft'
import { Textarea } from '../ui/textarea'
import { ConfirmSheet } from '../ui/kit'

type ExerciseDoseEditorProps = {
  slot: DraftSlot
  onChange: (next: DraftSlot) => void
  onDelete: () => void
}

function roundStep(value: number, step: number): number {
  // Шаг 2.5 кг не должен схлопываться до целого: 40 + 2.5 = 42.5, а не 43.
  const decimals = Number.isInteger(step) ? 0 : 1
  return Number(value.toFixed(decimals))
}

function DoseStepper({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (next: number) => void
}) {
  const shown = Number.isInteger(value) ? String(value) : String(value)
  return (
    <div className="min-w-0">
      <span className="mb-1 block text-[11px] font-semibold text-secondary-foreground lg:mb-1.5 lg:text-[13px]">{label}</span>
      <div className="grid h-8 grid-cols-[36px_minmax(0,1fr)_36px] overflow-hidden rounded-xl border border-border bg-card lg:h-11 lg:rounded-[14px]">
        <button
          type="button"
          className="text-[18px] font-semibold"
          aria-label={`Меньше: ${label}`}
          onClick={() => onChange(roundStep(Math.max(min, value - step), step))}
        >
          −
        </button>
        <span className="flex items-center justify-center border-x border-border text-[15px] font-semibold lg:text-[17px]">{shown}</span>
        <button
          type="button"
          className="text-[18px] font-semibold"
          aria-label={`Больше: ${label}`}
          onClick={() => onChange(roundStep(Math.min(max, value + step), step))}
        >
          +
        </button>
      </div>
    </div>
  )
}

export function ExerciseDoseEditor({ slot, onChange, onDelete }: ExerciseDoseEditorProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const hold = Boolean(slot.durationSeconds && slot.durationSeconds > 0 && !slot.reps)
  return (
    <div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5 lg:mt-3 lg:grid-cols-4 lg:gap-2">
        <DoseStepper label="Подходы" value={slot.sets} min={1} max={10} onChange={(sets) => onChange({ ...slot, sets })} />
        {hold ? (
          <DoseStepper
            label="Секунды"
            value={slot.durationSeconds ?? 30}
            min={5}
            max={600}
            step={5}
            onChange={(durationSeconds) => onChange({ ...slot, durationSeconds, reps: null })}
          />
        ) : (
          <DoseStepper
            label="Повторы"
            value={slot.reps ?? 1}
            min={1}
            max={100}
            onChange={(reps) => onChange({ ...slot, reps, durationSeconds: null })}
          />
        )}
        <DoseStepper
          label="Вес, кг"
          value={slot.weightKg ?? 0}
          min={0}
          max={500}
          step={2.5}
          onChange={(weightKg) => onChange({ ...slot, weightKg })}
        />
        <DoseStepper
          label="Отдых, с"
          value={slot.restSeconds ?? 0}
          min={0}
          max={600}
          step={15}
          onChange={(restSeconds) => onChange({ ...slot, restSeconds })}
        />
      </div>
      <div className="mt-1 grid grid-cols-[minmax(0,1fr)_40px] items-end gap-2 lg:mt-2.5 lg:grid-cols-[minmax(0,1fr)_44px]">
        <label className="block min-w-0">
          <span className="sr-only lg:not-sr-only lg:mb-1.5 lg:block lg:text-[13px] lg:font-semibold lg:text-secondary-foreground">
            Заметка
          </span>
          <Textarea
            aria-label="Заметка"
            className="min-h-8 rounded-xl px-2.5 py-1.5 text-[13px] lg:min-h-12 lg:rounded-[14px] lg:px-3 lg:py-2.5 lg:text-[15px]"
            maxLength={500}
            value={slot.note}
            placeholder="Заметка"
            onChange={(event) => onChange({ ...slot, note: event.target.value.slice(0, 500) })}
          />
        </label>
        <button
          type="button"
          aria-label="Удалить упражнение"
          title="Удалить упражнение"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus lg:h-11 lg:w-11 lg:rounded-[14px]"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 aria-hidden size={18} />
        </button>
      </div>
      {confirmDelete ? (
        <ConfirmSheet
          title="Удалить упражнение"
          body="Убрать упражнение из этого дня? Изменение попадёт в план, когда вы нажмёте «Сохранить план»."
          confirmLabel="Удалить"
          tone="danger"
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false)
            onDelete()
          }}
        />
      ) : null}
    </div>
  )
}
