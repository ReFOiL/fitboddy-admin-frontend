import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import {
  listPlatformExercises,
  listTrainerExercises,
  queryKeys,
  upsertClientLoad,
  upsertClientPlatformLoad,
  upsertProfile,
} from '../api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { ScreenHeader, StickyActionBar } from '../components/ui/kit'
import { QueryState } from '../components/shared'
import { useAuth } from '../hooks/use-auth'
import { useClientLoads, useClientPlatformLoads } from '../hooks/use-plans'
import { useProfile } from '../hooks/use-profile'
import { useClientRelations } from '../hooks/use-relations'
import { collectCatalogEquipmentTags, formatEquipmentLabel } from '../lib/equipment'
import { buildUpsertProfileRequest, profileToFormValues } from '../lib/profile-schema'
import { getUserErrorMessage } from '../lib/user-error-message'
import { cn } from '../lib/utils'

export function ClientTrainingSettingsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  if (user?.role !== 'client' || !user.user_id) {
    return <p className="py-8 text-[17px]">Этот раздел доступен только клиентам.</p>
  }
  return <TrainingSettings userId={user.user_id} onBack={() => navigate(-1)} />
}

function sameEquipment(left: string[], right: string[]): boolean {
  const key = (value: string) => value.toLocaleLowerCase('ru-RU')
  const a = [...left].map(key).sort()
  const b = [...right].map(key).sort()
  return a.length === b.length && a.every((item, index) => item === b[index])
}

function TrainingSettings({ userId, onBack }: { userId: string; onBack: () => void }) {
  const queryClient = useQueryClient()
  const { profileQuery, metaQuery } = useProfile(userId)
  const { clientActiveRelationQuery } = useClientRelations({ clientUserId: userId })
  const trainerUserId = clientActiveRelationQuery.data?.trainer_user_id ?? ''
  const hasTrainer = Boolean(trainerUserId)
  const trainerCatalogQuery = useQuery({
    queryKey: queryKeys.exercises.trainerCatalog(trainerUserId, false),
    queryFn: async () => listTrainerExercises(trainerUserId, false),
    enabled: Boolean(trainerUserId),
  })
  const platformCatalogQuery = useQuery({
    queryKey: queryKeys.exercises.platformCatalog,
    queryFn: async () => listPlatformExercises(),
    enabled: !hasTrainer,
  })
  const trainerLoads = useClientLoads(userId, trainerUserId)
  const platformLoads = useClientPlatformLoads(hasTrainer ? '' : userId)
  const loadsQuery = hasTrainer ? trainerLoads.loadsQuery : platformLoads.loadsQuery
  const catalog = hasTrainer ? trainerCatalogQuery.data : platformCatalogQuery.data
  const catalogLoading = hasTrainer ? trainerCatalogQuery.isLoading : platformCatalogQuery.isLoading
  const catalogError = hasTrainer ? trainerCatalogQuery.isError : platformCatalogQuery.isError

  const profile = profileQuery.data
  const savedEquipment = Array.isArray(profile?.unavailable_equipment) ? profile.unavailable_equipment : []
  const [equipmentDraft, setEquipmentDraft] = useState<string[] | null>(null)
  const [weightDraft, setWeightDraft] = useState<Record<string, string>>({})
  const [seedKey, setSeedKey] = useState('')

  const catalogTags = collectCatalogEquipmentTags(Array.isArray(catalog) ? catalog : [])
  const metaTags = (metaQuery.data?.equipment ?? []).map((item) => item.value).filter(Boolean)
  const sourceTags = catalogTags.length > 0 ? catalogTags : metaTags
  const equipment = equipmentDraft ?? savedEquipment
  const unavailableKeys = new Set(equipment.map((item) => item.toLocaleLowerCase('ru-RU')))
  const options = [
    ...sourceTags.map((value) => ({ value, label: formatEquipmentLabel(value, metaQuery.data?.equipment) })),
    ...equipment
      .filter((value) => !sourceTags.some((tag) => tag.toLocaleLowerCase('ru-RU') === value.toLocaleLowerCase('ru-RU')))
      .map((value) => ({ value, label: formatEquipmentLabel(value, metaQuery.data?.equipment) })),
  ].map((option) => ({
    ...option,
    selected: unavailableKeys.has(option.value.toLocaleLowerCase('ru-RU')),
  }))

  const weightExercises = (Array.isArray(catalog) ? catalog : []).filter(
    (exercise) => exercise.is_active && exercise.default_weight_kg != null && exercise.default_weight_kg > 0,
  )
  const loadsByExercise = new Map(
    (Array.isArray(loadsQuery.data) ? loadsQuery.data : []).map((item) => [item.exercise_row_id, item.working_weight_kg]),
  )
  const readyKey = `${profile?.user_id ?? ''}:${loadsQuery.dataUpdatedAt}:${weightExercises.map((item) => item.row_id).join(',')}`
  if (profile && !loadsQuery.isLoading && !catalogLoading && seedKey !== readyKey) {
    const next: Record<string, string> = {}
    for (const exercise of weightExercises) {
      const saved = loadsByExercise.get(exercise.row_id)
      next[exercise.row_id] = saved != null ? String(saved) : ''
    }
    setWeightDraft(next)
    setEquipmentDraft([...(profile.unavailable_equipment ?? [])])
    setSeedKey(readyKey)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('Профиль ещё не загружен')
      const problems: string[] = []
      const writes: { exerciseRowId: string; value: number }[] = []
      for (const exercise of weightExercises) {
        const raw = (weightDraft[exercise.row_id] ?? '').trim().replace(',', '.')
        const saved = loadsByExercise.get(exercise.row_id)
        if (!raw) {
          if (saved != null) problems.push(exercise.exercise_name)
          continue
        }
        const value = Number(raw)
        if (!Number.isFinite(value) || value <= 0) {
          problems.push(exercise.exercise_name)
          continue
        }
        if (saved !== value) writes.push({ exerciseRowId: exercise.row_id, value })
      }
      if (problems.length > 0) {
        throw new Error(`Укажите вес больше нуля: ${problems.join(', ')}`)
      }
      const nextEquipment = equipmentDraft ?? savedEquipment
      const equipmentChanged = !sameEquipment(nextEquipment, savedEquipment)
      if (!equipmentChanged && writes.length === 0) return 'unchanged' as const
      if (equipmentChanged) {
        await upsertProfile(
          userId,
          buildUpsertProfileRequest({ ...profile, unavailable_equipment: nextEquipment }, profileToFormValues(profile)),
        )
      }
      for (const write of writes) {
        const payload = { working_weight_kg: write.value }
        if (hasTrainer) await upsertClientLoad(userId, trainerUserId, write.exerciseRowId, payload)
        else await upsertClientPlatformLoad(userId, write.exerciseRowId, payload)
      }
      return 'saved' as const
    },
    onSuccess: async (result) => {
      if (result === 'unchanged') {
        toast.message('Нет изменений')
        return
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.profiles.detail(userId) })
      await queryClient.invalidateQueries({ queryKey: ['plans'] })
      toast.success('Сохранено')
    },
    onError: (error) => {
      const message = error instanceof Error && error.message.startsWith('Укажите вес')
        ? error.message
        : getUserErrorMessage(error, 'Не удалось сохранить.')
      toast.error(message)
    },
  })

  return (
    <div className="mx-auto w-full max-w-lg pb-28">
      <ScreenHeader title="Веса и инвентарь" onBack={onBack} />
      <p className="mt-4 text-[15px] text-secondary-foreground">
        Отметьте, чего нет под рукой, и рабочие веса. Ничего не сохранится, пока вы не нажмёте «Сохранить».
      </p>

      <section className="mt-6">
        <h2 className="text-[17px] font-semibold">Чего нет</h2>
        {options.length === 0 ? (
          <p className="mt-2 text-[15px] text-secondary-foreground">Нет инвентаря для исключения.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={option.selected}
                className={cn(
                  'inline-flex h-12 items-center gap-2 rounded-full border px-4 text-[15px] font-semibold',
                  option.selected ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-transparent bg-secondary',
                )}
                onClick={() => {
                  const key = option.value.toLocaleLowerCase('ru-RU')
                  const current = equipmentDraft ?? savedEquipment
                  const next = option.selected
                    ? current.filter((item) => item.toLocaleLowerCase('ru-RU') !== key)
                    : [...current, option.value]
                  setEquipmentDraft(next)
                }}
              >
                {option.selected ? <Ban size={14} /> : null}
                <span className={cn(option.selected && 'line-through')}>{option.label}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-[17px] font-semibold">Рабочие веса</h2>
        {catalogLoading || loadsQuery.isLoading ? <p className="mt-2 text-[15px]">Загрузка…</p> : null}
        {catalogError || loadsQuery.isError ? (
          <QueryState
            isError
            errorTitle="Не удалось загрузить рабочие веса"
            onRetry={() => {
              void (hasTrainer ? trainerCatalogQuery.refetch() : platformCatalogQuery.refetch())
              void loadsQuery.refetch()
            }}
          >
            {null}
          </QueryState>
        ) : null}
        {weightExercises.length === 0 && !catalogLoading ? (
          <p className="mt-2 text-[15px] text-secondary-foreground">Упражнений с весом пока нет.</p>
        ) : null}
        <div className="mt-2">
          {weightExercises.map((exercise) => (
            <label key={exercise.row_id} className="flex min-h-16 items-center gap-3 border-b border-border py-2">
              <span className="min-w-0 flex-1 truncate text-[17px] font-semibold">{exercise.exercise_name}</span>
              <Input
                type="number"
                inputMode="decimal"
                min={0.5}
                step={0.5}
                aria-label={`Рабочий вес: ${exercise.exercise_name}`}
                className="h-12 w-28"
                value={weightDraft[exercise.row_id] ?? ''}
                placeholder={exercise.default_weight_kg != null ? String(exercise.default_weight_kg) : ''}
                onChange={(event) =>
                  setWeightDraft((current) => ({ ...current, [exercise.row_id]: event.target.value }))
                }
              />
            </label>
          ))}
        </div>
      </section>

      <StickyActionBar>
        <Button type="button" size="lg" className="h-12 w-full" disabled={saveMutation.isPending || !profile} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? 'Сохраняем…' : 'Сохранить'}
        </Button>
      </StickyActionBar>
    </div>
  )
}
