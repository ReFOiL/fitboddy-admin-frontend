import { ArrowLeft, Library, Plus, Save } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import {
  moveSlot,
  replaceDaySlots,
  slotFromCatalog,
  type EditorDay,
  type EditorSlot,
} from '../../lib/plan-editor-draft'
import type { TrainerExercise } from '../../types/exercise'
import { GenerateBlockNote } from '../plan/GenerateBlockNote'
import { StickySaveBar } from '../plan/StickySaveBar'
import { EmptyState } from '../shared'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { ExerciseCatalogPicker } from './ExerciseCatalogPicker'
import { PlanDaySwitcher } from './PlanDaySwitcher'
import { PlanSlotCard } from './PlanSlotCard'

type TrainerPlanEditorProps = {
  clientName: string
  levelLabel: string
  trainerUserId: string
  backTo: string
  days: EditorDay[] | null
  catalog: TrainerExercise[]
  catalogLoading: boolean
  isDirty: boolean
  dosageError: string | null
  savePending: boolean
  saveDisabled: boolean
  generatePending: boolean
  generateDisabledReason: string | null
  foreignPlanNotice: string | null
  onChangeDays: (days: EditorDay[]) => void
  onSave: () => void
  onGenerate: () => void
  onStartEmpty: (dayCount: number) => void
}

export function TrainerPlanEditor({
  clientName,
  levelLabel,
  trainerUserId,
  backTo,
  days,
  catalog,
  catalogLoading,
  isDirty,
  dosageError,
  savePending,
  saveDisabled,
  generatePending,
  generateDisabledReason,
  foreignPlanNotice,
  onChangeDays,
  onSave,
  onGenerate,
  onStartEmpty,
}: TrainerPlanEditorProps) {
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [emptyDayCount, setEmptyDayCount] = useState(3)

  const selectedDay = days?.find((day) => day.dayId === selectedDayId) ?? days?.[0] ?? null

  const updateSelectedSlots = (slots: EditorSlot[]) => {
    if (!days || !selectedDay) return
    onChangeDays(replaceDaySlots(days, selectedDay.dayId, slots))
  }

  return (
    <div className="space-y-4 pb-28 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Button asChild type="button" variant="secondary" size="sm" className="w-full sm:w-auto">
            <Link to={backTo}>
              <ArrowLeft size={14} />
              К профилю клиента
            </Link>
          </Button>
          <div>
            <h1 className="truncate text-2xl font-semibold tracking-tight">{clientName}</h1>
            <p className="text-sm text-secondary-foreground">Уровень: {levelLabel}</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Button
            type="button"
            variant="secondary"
            disabled={generatePending || Boolean(generateDisabledReason)}
            onClick={onGenerate}
          >
            <Library size={16} />
            {generatePending ? 'Собираем…' : 'Собрать из каталога'}
          </Button>
          <Button type="button" disabled={saveDisabled} onClick={onSave}>
            <Save size={16} />
            {savePending ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </div>
      </div>

      <div className="md:hidden">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={generatePending || Boolean(generateDisabledReason)}
          onClick={onGenerate}
        >
          <Library size={16} />
          {generatePending ? 'Собираем…' : 'Собрать из каталога'}
        </Button>
      </div>
      <GenerateBlockNote reason={generateDisabledReason} />

      {foreignPlanNotice ? (
        <p className="rounded-xl border border-border/70 bg-secondary/20 px-3 py-2 text-sm text-secondary-foreground">
          {foreignPlanNotice}
        </p>
      ) : null}

      {days == null ? (
        <EmptyPlanState
          dayCount={emptyDayCount}
          onDayCount={setEmptyDayCount}
          generatePending={generatePending}
          generateDisabledReason={generateDisabledReason}
          onGenerate={onGenerate}
          onStartEmpty={() => onStartEmpty(emptyDayCount)}
        />
      ) : null}

      {days && selectedDay ? (
        <section className="space-y-3">
          <PlanDaySwitcher days={days} selectedDayId={selectedDay.dayId} onSelectDay={setSelectedDayId} />
          {selectedDay.slots.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-secondary-foreground">
              В этом дне пока нет упражнений.
            </p>
          ) : (
            <div className="space-y-3">
              {selectedDay.slots.map((slot, index) => (
                <PlanSlotCard
                  key={slot.key}
                  slot={slot}
                  index={index}
                  total={selectedDay.slots.length}
                  onChange={(next) => {
                    const slots = selectedDay.slots.map((item) => (item.key === slot.key ? next : item))
                    updateSelectedSlots(slots)
                  }}
                  onMove={(direction) => updateSelectedSlots(moveSlot(selectedDay.slots, index, direction))}
                  onDelete={() => updateSelectedSlots(selectedDay.slots.filter((item) => item.key !== slot.key))}
                />
              ))}
            </div>
          )}
          {pickerOpen ? (
            <ExerciseCatalogPicker
              trainerUserId={trainerUserId}
              exercises={catalog}
              loading={catalogLoading}
              onPick={(exercise) => updateSelectedSlots([...selectedDay.slots, slotFromCatalog(exercise)])}
            />
          ) : null}
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => setPickerOpen((open) => !open)}>
            <Plus size={16} />
            {pickerOpen ? 'Скрыть каталог' : 'Добавить упражнение'}
          </Button>
        </section>
      ) : null}

      {dosageError ? (
        <p className="text-sm text-destructive" role="alert">
          {dosageError}
        </p>
      ) : null}

      {days ? (
        <StickySaveBar className="md:hidden">
          <div className="flex items-center gap-3">
            <span className={isDirty ? 'text-sm font-medium' : 'text-sm text-secondary-foreground'} aria-live="polite">
              {isDirty ? 'Есть изменения' : 'Сохранено'}
            </span>
            <Button type="button" className="ml-auto min-h-11 flex-1" disabled={saveDisabled} onClick={onSave}>
              <Save size={16} />
              {savePending ? 'Сохраняем…' : 'Сохранить'}
            </Button>
          </div>
        </StickySaveBar>
      ) : null}
    </div>
  )
}

function EmptyPlanState({
  dayCount,
  onDayCount,
  generatePending,
  generateDisabledReason,
  onGenerate,
  onStartEmpty,
}: {
  dayCount: number
  onDayCount: (value: number) => void
  generatePending: boolean
  generateDisabledReason: string | null
  onGenerate: () => void
  onStartEmpty: () => void
}) {
  return (
    <EmptyState
      title="Плана пока нет"
      description="Соберите черновик из каталога или начните с пустых дней цикла."
      action={
        <div className="flex w-full max-w-sm flex-col gap-3">
          <Button type="button" className="w-full" disabled={generatePending || Boolean(generateDisabledReason)} onClick={onGenerate}>
            <Library size={16} />
            {generatePending ? 'Собираем…' : 'Собрать из каталога'}
          </Button>
          <div className="grid gap-1.5 text-left">
            <Label htmlFor="empty-cycle-days">Дней в цикле</Label>
            <Input
              id="empty-cycle-days"
              type="number"
              min={1}
              max={7}
              value={dayCount}
              onChange={(event) => {
                const next = Number(event.target.value)
                if (!Number.isFinite(next)) return
                onDayCount(Math.min(7, Math.max(1, Math.trunc(next))))
              }}
            />
          </div>
          <Button type="button" variant="secondary" className="w-full" onClick={onStartEmpty}>
            Начать с пустого
          </Button>
        </div>
      }
    />
  )
}
