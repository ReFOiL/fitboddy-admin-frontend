import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { formatEquipmentLabel } from '../../lib/equipment'
import type { DraftSlot } from '../../lib/plan-draft'
import type { TrainerExercise } from '../../types/exercise'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { ConfirmSheet, ExerciseThumb, Sheet, Stepper } from '../ui/kit'

type ExerciseSlotSheetProps = {
  slot: DraftSlot
  media?: TrainerExercise
  onChange: (next: DraftSlot) => void
  onDelete: () => void
  onClose: () => void
}

export function ExerciseSlotSheet({ slot, media, onChange, onDelete, onClose }: ExerciseSlotSheetProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const hold = Boolean(slot.durationSeconds && slot.durationSeconds > 0 && !slot.reps)
  const description = media?.description?.trim()
  return (
    <>
      <Sheet title={slot.exerciseName} onClose={onClose}>
        <div className="max-h-[52dvh] overflow-y-auto pr-1">
          <div className="flex items-center gap-3">
            <ExerciseThumb imageUrl={media?.start_image_url} hasVideo={Boolean(media?.video_url)} />
            {media ? (
              <p className="text-[15px] text-secondary-foreground">{formatEquipmentLabel(media.equipment)}</p>
            ) : null}
          </div>
          {description ? <p className="mt-1 line-clamp-3 text-[15px] text-secondary-foreground">{description}</p> : null}
          <div className="mt-2 divide-y divide-border">
            <Stepper label="Подходы" value={slot.sets} min={1} max={10} onChange={(sets) => onChange({ ...slot, sets })} />
            {hold ? (
              <Stepper
                label="Секунды"
                value={slot.durationSeconds ?? 30}
                min={5}
                max={600}
                step={5}
                onChange={(durationSeconds) => onChange({ ...slot, durationSeconds, reps: null })}
              />
            ) : (
              <Stepper
                label="Повторы"
                value={slot.reps ?? 1}
                min={1}
                max={100}
                onChange={(reps) => onChange({ ...slot, reps, durationSeconds: null })}
              />
            )}
            <Stepper
              label="Вес, кг"
              value={slot.weightKg ?? 0}
              min={0}
              max={500}
              step={2.5}
              onChange={(weightKg) => onChange({ ...slot, weightKg })}
            />
            <Stepper
              label="Отдых, с"
              value={slot.restSeconds ?? 0}
              min={0}
              max={600}
              step={15}
              onChange={(restSeconds) => onChange({ ...slot, restSeconds })}
            />
          </div>
        </div>
        <label className="mt-3 grid gap-2 text-[17px] font-semibold" htmlFor="slot-note">
          Заметка
          <Textarea
            id="slot-note"
            className="min-h-16"
            maxLength={500}
            value={slot.note}
            placeholder="Как выполнять"
            onChange={(event) => onChange({ ...slot, note: event.target.value.slice(0, 500) })}
          />
        </label>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            aria-label="Удалить упражнение"
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 aria-hidden size={18} />
          </button>
          <Button type="button" className="h-12 flex-1" onClick={onClose}>
            К плану
          </Button>
        </div>
      </Sheet>
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
    </>
  )
}
