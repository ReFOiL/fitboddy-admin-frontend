import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { queryKeys, upsertClientLoad } from '../../api'
import { useClientLoads } from '../../hooks/use-plans'
import { getUserErrorMessage } from '../../lib/user-error-message'
import { readWorkingWeight } from '../../lib/working-weight'
import type { TrainerExercise } from '../../types/exercise'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ScreenHeader, StickyActionBar } from '../ui/kit'

type WorkingWeightsProps = {
  clientUserId: string
  trainerUserId: string
  catalog: TrainerExercise[]
  onBack: () => void
}

export function WorkingWeights({ clientUserId, trainerUserId, catalog, onBack }: WorkingWeightsProps) {
  const queryClient = useQueryClient()
  const { loadsQuery } = useClientLoads(clientUserId, trainerUserId)
  const weighted = catalog.filter((item) => item.default_weight_kg != null && item.default_weight_kg > 0)
  const loads = new Map((loadsQuery.data ?? []).map((item) => [item.exercise_row_id, item.working_weight_kg]))
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const saveMutation = useMutation({
    mutationFn: async (items: { exerciseRowId: string; value: number }[]) => {
      // Одно сохранение на все введённые строки, без кнопки «Ок» в каждой.
      for (const item of items) {
        await upsertClientLoad(clientUserId, trainerUserId, item.exerciseRowId, { working_weight_kg: item.value })
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.plans.clientLoads(clientUserId, trainerUserId) })
      setDraft({})
      setErrors({})
      toast.success('Рабочие веса сохранены')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось сохранить веса.')),
  })

  const filled = weighted.filter((exercise) => (draft[exercise.row_id] ?? '').trim().length > 0)

  const save = () => {
    const nextErrors: Record<string, string> = {}
    const items: { exerciseRowId: string; value: number }[] = []
    for (const exercise of weighted) {
      const parsed = readWorkingWeight(draft[exercise.row_id] ?? '')
      if (parsed.state === 'empty') continue
      if (parsed.state === 'invalid') {
        nextErrors[exercise.row_id] = 'Укажите вес больше нуля.'
        continue
      }
      items.push({ exerciseRowId: exercise.row_id, value: parsed.value })
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || items.length === 0) return
    saveMutation.mutate(items)
  }

  return (
    <div className="mx-auto w-full max-w-lg pb-28">
      <ScreenHeader title="Рабочие веса" onBack={onBack} />
      <p className="mt-3 text-[15px] text-secondary-foreground">Введите веса и сохраните их одной кнопкой.</p>
      {weighted.map((exercise) => {
        const error = errors[exercise.row_id]
        const errorId = `weight-error-${exercise.row_id}`
        return (
          <div key={exercise.row_id} className="border-b border-border py-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-[17px] font-semibold leading-snug">{exercise.exercise_name}</div>
                <div className="text-[15px] text-secondary-foreground">Сейчас {loads.get(exercise.row_id) ?? '—'} кг</div>
              </div>
              <Input
                className="h-12 w-24"
                inputMode="decimal"
                aria-label={`Вес ${exercise.exercise_name}`}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
                value={draft[exercise.row_id] ?? ''}
                onChange={(event) => {
                  const value = event.target.value
                  setDraft((current) => ({ ...current, [exercise.row_id]: value }))
                  setErrors((current) => {
                    if (!current[exercise.row_id]) return current
                    const next = { ...current }
                    delete next[exercise.row_id]
                    return next
                  })
                }}
              />
            </div>
            {error ? (
              <p id={errorId} className="mt-1 text-[13px] text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        )
      })}
      {weighted.length === 0 ? <p className="py-6 text-[17px]">В каталоге нет упражнений с весом.</p> : null}
      {weighted.length > 0 ? (
        <StickyActionBar>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[15px] text-secondary-foreground">
              {filled.length === 0 ? 'Нет изменений' : 'Есть изменения'}
            </span>
            <Button
              type="button"
              size="lg"
              className="ml-auto h-12 min-w-36 flex-1"
              disabled={filled.length === 0 || saveMutation.isPending}
              onClick={save}
            >
              {saveMutation.isPending ? 'Сохраняем…' : 'Сохранить веса'}
            </Button>
          </div>
        </StickyActionBar>
      ) : null}
    </div>
  )
}
