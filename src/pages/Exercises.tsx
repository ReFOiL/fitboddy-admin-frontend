import { ArchiveRestore, Dumbbell, Search } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { CatalogSyncDialog } from '../components/exercises/CatalogSyncDialog'
import { formatExerciseDoseLine } from '../components/exercises/exercise-form'
import { ExerciseThumb } from '../components/ui/kit'
import { APP_PATHS } from '../config'
import { useCatalogSyncAttention, type CatalogSyncAttentionStatus } from '../hooks/use-catalog-sync-attention'
import { useAuth } from '../hooks/use-auth'
import { useExercises } from '../hooks/use-exercises'
import { formatEquipmentLabel } from '../lib/equipment'
import { formatWorkoutCategory } from '../lib/muscles'
import { QueryState } from '../components/shared'
import { Button } from '../components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'

type CatalogFilterMode = 'all' | 'active' | 'archived'

const FILTERS: Array<{ id: CatalogFilterMode; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'active', label: 'Активные' },
  { id: 'archived', label: 'Архив' },
]

const CATEGORY_LABELS: Record<string, string> = {
  верх: 'верх тела',
  низ: 'низ тела',
  корпус: 'корпус',
  upper: 'верх тела',
  lower: 'низ тела',
  core: 'корпус',
  full_body: 'все тело',
  lower_body: 'низ тела',
}

function formatCategory(value: string): string {
  const key = value.trim().toLowerCase()
  return CATEGORY_LABELS[key] ?? formatWorkoutCategory(key)
}

export function ExercisesPage() {
  const { user } = useAuth()
  const isTrainer = user?.role === 'trainer'
  const trainerUserId = isTrainer && user?.user_id ? user.user_id : ''
  const syncHintId = useId()
  const syncAttention = useCatalogSyncAttention(trainerUserId)
  const showSyncDot = syncAttention.showDot
  const [syncOpen, setSyncOpen] = useState(false)
  const [filterMode, setFilterMode] = useState<CatalogFilterMode>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const includeArchived = filterMode !== 'active'
  const { trainerCatalogQuery, restoreExerciseMutation } = useExercises({
    trainerUserId,
    includeArchived,
  })
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const filteredCatalog = useMemo(() => {
    const catalog = Array.isArray(trainerCatalogQuery.data) ? trainerCatalogQuery.data : []
    const byStatus = catalog.filter((exercise) => {
      if (filterMode === 'active') return exercise.is_active
      if (filterMode === 'archived') return !exercise.is_active
      return true
    })
    if (!normalizedSearch) return byStatus
    return byStatus.filter((exercise) => exercise.exercise_name.toLowerCase().includes(normalizedSearch))
  }, [filterMode, normalizedSearch, trainerCatalogQuery.data])

  if (!isTrainer) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell size={18} className="text-accent-ink" />
            Упражнения
          </CardTitle>
          <CardDescription>Этот раздел доступен только тренерам.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-[28px] font-bold">Упражнения</h1>
        <p className="text-[15px] text-secondary-foreground">
          Подтяните новые упражнения из системной базы или создайте своё. Правки открываются на странице упражнения.
        </p>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button asChild type="button" size="lg" className="w-full sm:w-auto sm:min-w-56">
          <Link to={APP_PATHS.exerciseNew}>Создать упражнение</Link>
        </Button>
        <Button
          type="button"
          size="lg"
          variant="secondary"
          className="w-full sm:w-auto sm:min-w-56"
          aria-describedby={showSyncDot ? syncHintId : undefined}
          data-sync-attention={syncAttentionMarker(syncAttention.status, showSyncDot)}
          onClick={() => setSyncOpen(true)}
        >
          Синхронизировать с системной базой
          {showSyncDot ? <CatalogSyncAttentionDot /> : null}
        </Button>
        {showSyncDot ? (
          <span id={syncHintId} className="sr-only">
            В системной базе есть упражнения, которые можно добавить или обновить.
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((filter) => (
          <Button
            key={filter.id}
            type="button"
            size="sm"
            variant={filterMode === filter.id ? 'default' : 'secondary'}
            onClick={() => setFilterMode(filter.id)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="pl-9"
          placeholder="Поиск по названию"
          aria-label="Поиск по названию"
        />
      </div>

      {trainerCatalogQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : null}
      {trainerCatalogQuery.isError ? (
        <QueryState
          isError
          errorTitle="Не удалось загрузить каталог упражнений"
          onRetry={() => void trainerCatalogQuery.refetch()}
        >
          {null}
        </QueryState>
      ) : null}
      {!trainerCatalogQuery.isLoading && !trainerCatalogQuery.isError ? (
        <div className="space-y-3">
          {filteredCatalog.length === 0 ? (
            <span className="text-sm text-secondary-foreground">По текущим фильтрам упражнения не найдены.</span>
          ) : (
            filteredCatalog.map((exercise) => (
              <div key={exercise.row_id} className="border-b border-border py-3">
                <Link
                  to={`/exercises/${encodeURIComponent(exercise.row_id)}`}
                  className="flex min-h-16 items-center justify-between gap-3"
                >
                  <ExerciseThumb imageUrl={exercise.start_image_url} hasVideo={Boolean(exercise.video_url)} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-semibold">{exercise.exercise_name}</span>
                    <span className="block text-[15px] text-secondary-foreground">
                      {formatCategory(exercise.workout_category)} · {formatEquipmentLabel(exercise.equipment)} ·{' '}
                      {formatExerciseDoseLine(exercise)}
                      {exercise.is_active ? '' : ' · Архив'}
                    </span>
                  </span>
                  <span aria-hidden>›</span>
                </Link>
                {!exercise.is_active ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-12 gap-2"
                      onClick={() => restoreExerciseMutation.mutate(exercise.row_id)}
                      disabled={restoreExerciseMutation.isPending}
                    >
                      <ArchiveRestore size={14} />
                      Восстановить
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}

      {syncOpen ? <CatalogSyncDialog trainerUserId={trainerUserId} onClose={() => setSyncOpen(false)} /> : null}
    </div>
  )
}

function syncAttentionMarker(
  status: CatalogSyncAttentionStatus,
  showDot: boolean,
): 'pending' | 'clear' | 'error' | undefined {
  switch (status) {
    case 'loading':
      return undefined
    case 'error':
      return 'error'
    case 'ready':
      return showDot ? 'pending' : 'clear'
    default: {
      const unexpected: never = status
      return unexpected
    }
  }
}

function CatalogSyncAttentionDot() {
  return (
    <span
      aria-hidden
      data-testid="catalog-sync-pending-dot"
      className="h-2 w-2 shrink-0 rounded-full bg-destructive"
    />
  )
}
