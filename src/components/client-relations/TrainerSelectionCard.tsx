import { Eye, Link2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Avatar } from '../ui/kit'
import { Skeleton } from '../ui/skeleton'
import { AlertBanner, EmptyState, QueryState } from '../shared'
import type { DiscoveryProfile } from '../../types/relation'
import { APP_PATHS } from '../../config'

type TrainerSelectionCardProps = {
  trainers: DiscoveryProfile[]
  isLoading: boolean
  isError: boolean
  hasActiveTrainer: boolean
  isActiveRelationLoading: boolean
  isActiveRelationError: boolean
  mustCompleteQuestionnaire: boolean
  createPending: boolean
  onRetry: () => void
  onRetryActiveRelation: () => void
  onConnect: (trainerUserId: string) => void
}

export function TrainerSelectionCard({
  trainers,
  isLoading,
  isError,
  hasActiveTrainer,
  isActiveRelationLoading,
  isActiveRelationError,
  mustCompleteQuestionnaire,
  createPending,
  onRetry,
  onRetryActiveRelation,
  onConnect,
}: TrainerSelectionCardProps) {
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Выберите тренера
        </CardTitle>
        <CardDescription>Открытые тренеры ниже. Подключение — одна кнопка.</CardDescription>
      </CardHeader>
      <CardContent>
        <QueryState
          isLoading={isLoading}
          isError={isError}
          isEmpty={trainers.length === 0}
          onRetry={onRetry}
          errorTitle="Не удалось загрузить тренеров"
          loadingFallback={<div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>}
          emptyFallback={<EmptyState className="py-7" title="Доступных тренеров пока нет" />}
        >
          <div className="space-y-3">
            {trainers.map((trainer) => {
              const name = trainer.display_name?.trim() || 'Тренер'
              return (
                <div key={trainer.user_id} className="flex min-h-16 items-center gap-3 border-b border-border py-3">
                  <Avatar name={name} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[17px] font-semibold">{name}</div>
                  </div>
                  <Button asChild variant="secondary" className="h-12 shrink-0 px-4">
                    <Link to={APP_PATHS.trainerProfile.replace(':trainerUserId', encodeURIComponent(trainer.user_id))}>
                      <Eye size={16} />
                      Профиль
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    className="h-12 shrink-0 px-4"
                    onClick={() => onConnect(trainer.user_id)}
                    disabled={createPending || mustCompleteQuestionnaire || isActiveRelationLoading || isActiveRelationError || hasActiveTrainer}
                  >
                    <Link2 size={16} />
                    {createPending ? 'Подключаем…' : hasActiveTrainer ? 'Уже подключён' : 'Подключиться'}
                  </Button>
                </div>
              )
            })}
          </div>
        </QueryState>
        {!isActiveRelationLoading && !isActiveRelationError && hasActiveTrainer ? (
          <AlertBanner className="mt-3" title="Тренер уже подключён">
            Активная связь уже есть. Завершите текущую связь, чтобы выбрать другого тренера.
          </AlertBanner>
        ) : null}
        {isActiveRelationError ? (
          <QueryState
            isError
            onRetry={onRetryActiveRelation}
            errorTitle="Не удалось проверить связь с тренером"
          >
            {null}
          </QueryState>
        ) : null}
      </CardContent>
    </Card>
  )
}
