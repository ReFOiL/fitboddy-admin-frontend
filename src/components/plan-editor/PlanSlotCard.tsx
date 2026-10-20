import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

import { parseOptionalNumber, type EditorSlot } from '../../lib/plan-editor-draft'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

type PlanSlotCardProps = {
  slot: EditorSlot
  index: number
  total: number
  onChange: (slot: EditorSlot) => void
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
}

function numberValue(value: number | null): string {
  return value == null ? '' : String(value)
}

export function PlanSlotCard({ slot, index, total, onChange, onMove, onDelete }: PlanSlotCardProps) {
  const patch = (partial: Partial<EditorSlot>) => onChange({ ...slot, ...partial })

  return (
    <article className="rounded-2xl border border-border/70 bg-secondary/20 p-3 sm:p-4">
      <div className="flex items-start gap-2">
        <div className="flex shrink-0 flex-col gap-1">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-11 w-11 px-0 sm:h-9 sm:w-9"
            aria-label={`Выше: ${slot.exerciseName}`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ChevronUp size={16} />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-11 w-11 px-0 sm:h-9 sm:w-9"
            aria-label={`Ниже: ${slot.exerciseName}`}
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <ChevronDown size={16} />
          </Button>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">{slot.exerciseName}</h3>
              <p className="text-xs text-secondary-foreground">
                {slot.isHold ? 'Удержание' : 'Повторы'}
                {slot.isCardio ? ' · кардио' : ''}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-11 shrink-0 border border-destructive/40 px-3 text-destructive hover:bg-destructive/10 sm:h-9"
              aria-label={`Удалить ${slot.exerciseName}`}
              onClick={onDelete}
            >
              <Trash2 size={14} />
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="grid gap-1">
              <Label className="text-xs text-secondary-foreground">Подходы</Label>
              <Input
                inputMode="numeric"
                aria-label={`Подходы: ${slot.exerciseName}`}
                value={numberValue(slot.sets)}
                onChange={(event) => patch({ sets: parseOptionalNumber(event.target.value) })}
              />
            </label>
            {slot.isHold ? (
              <label className="grid gap-1">
                <Label className="text-xs text-secondary-foreground">Удержание, сек</Label>
                <Input
                  inputMode="numeric"
                  aria-label={`Удержание: ${slot.exerciseName}`}
                  value={numberValue(slot.durationSeconds)}
                  onChange={(event) => patch({ durationSeconds: parseOptionalNumber(event.target.value) })}
                />
              </label>
            ) : (
              <label className="grid gap-1">
                <Label className="text-xs text-secondary-foreground">Повторы</Label>
                <Input
                  inputMode="numeric"
                  aria-label={`Повторы: ${slot.exerciseName}`}
                  value={numberValue(slot.reps)}
                  onChange={(event) => patch({ reps: parseOptionalNumber(event.target.value) })}
                />
              </label>
            )}
            <label className="grid gap-1">
              <Label className="text-xs text-secondary-foreground">Отдых, сек</Label>
              <Input
                inputMode="numeric"
                aria-label={`Отдых: ${slot.exerciseName}`}
                value={numberValue(slot.restSeconds)}
                onChange={(event) => patch({ restSeconds: parseOptionalNumber(event.target.value) })}
              />
            </label>
            <label className="grid gap-1">
              <Label className="text-xs text-secondary-foreground">Вес, кг</Label>
              <Input
                inputMode="decimal"
                aria-label={`Вес: ${slot.exerciseName}`}
                value={numberValue(slot.weightKg)}
                onChange={(event) => patch({ weightKg: parseOptionalNumber(event.target.value) })}
              />
            </label>
          </div>
        </div>
      </div>
    </article>
  )
}
