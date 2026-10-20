import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { formatEquipmentLabel } from '../../lib/equipment'
import { sortCatalogForPicker } from '../../lib/plan-editor-draft'
import type { TrainerExercise } from '../../types/exercise'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

type ExerciseCatalogPickerProps = {
  trainerUserId: string
  exercises: TrainerExercise[]
  loading: boolean
  onPick: (exercise: TrainerExercise) => void
}

function dosageLabel(exercise: TrainerExercise): string {
  if (exercise.is_hold) {
    const seconds = exercise.default_duration_seconds ?? '—'
    return `${exercise.default_sets}× ${seconds} сек`
  }
  const reps = exercise.default_reps ?? '—'
  return `${exercise.default_sets}× ${reps} повт.`
}

export function ExerciseCatalogPicker({ trainerUserId, exercises, loading, onPick }: ExerciseCatalogPickerProps) {
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLocaleLowerCase('ru-RU')
  const sorted = useMemo(() => sortCatalogForPicker(exercises, trainerUserId), [exercises, trainerUserId])
  const filtered = sorted.filter((exercise) => {
    if (!normalized) return true
    const equipment = formatEquipmentLabel(exercise.equipment).toLocaleLowerCase('ru-RU')
    return (
      exercise.exercise_name.toLocaleLowerCase('ru-RU').includes(normalized) ||
      equipment.includes(normalized)
    )
  })
  const own = filtered.filter((exercise) => exercise.trainer_user_id === trainerUserId)
  const other = filtered.filter((exercise) => exercise.trainer_user_id !== trainerUserId)

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-background/60 p-3 sm:p-4">
      <div className="grid gap-1.5">
        <Label htmlFor="plan-exercise-search">Добавить упражнение</Label>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary-foreground" />
          <Input
            id="plan-exercise-search"
            value={query}
            placeholder="Название или инвентарь"
            className="pl-9"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      {loading ? <p className="text-sm text-secondary-foreground">Загрузка каталога…</p> : null}
      {!loading && filtered.length === 0 ? (
        <p className="text-sm text-secondary-foreground">
          {exercises.length === 0 ? 'В каталоге пока нет активных упражнений.' : 'Ничего не найдено.'}
        </p>
      ) : null}
      <CatalogGroup title="Ваши упражнения" exercises={own} onPick={onPick} />
      <CatalogGroup title="Остальной каталог" exercises={other} onPick={onPick} />
    </div>
  )
}

function CatalogGroup({
  title,
  exercises,
  onPick,
}: {
  title: string
  exercises: TrainerExercise[]
  onPick: (exercise: TrainerExercise) => void
}) {
  if (exercises.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-secondary-foreground">{title}</p>
      <ul className="max-h-72 space-y-1 overflow-y-auto">
        {exercises.map((exercise) => (
          <li key={exercise.row_id}>
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              onClick={() => onPick(exercise)}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{exercise.exercise_name}</span>
                <span className="block truncate text-xs text-secondary-foreground">
                  {formatEquipmentLabel(exercise.equipment)}
                </span>
              </span>
              <span className="shrink-0 text-xs text-secondary-foreground">{dosageLabel(exercise)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
