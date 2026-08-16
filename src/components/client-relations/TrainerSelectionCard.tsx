import { Eye, Link2, Search, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Skeleton } from '../ui/skeleton'
import { AlertBanner, EmptyState, QueryState } from '../shared'
import { formatRelationIdentity } from '../../lib/relations-formatters'
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
          <Search size={18} className="text-primary" />
          Выберите тренера
        </CardTitle>
        <CardDescription>Открытые тренеры доступны ниже. Подключение занимает один клик.</CardDescription>
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
            {trainers.map((trainer) => (
                <div key={trainer.user_id} className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-4 text-sm">
                  <div className="mb-1 flex items-center gap-2">
                    <Users size={16} className="text-primary" />
                    <span className="font-medium">Тренер</span>
                  </div>
                  <div className="mb-3 text-secondary-foreground">{formatRelationIdentity({ login: trainer.login, userId: trainer.user_id })}</div>
                  <div className="mb-3 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary">
                    Профиль подтвержден
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <Button asChild size="sm" variant="secondary" className="h-11 w-full gap-1.5 sm:h-8 sm:w-auto">
                      <Link to={APP_PATHS.trainerProfile.replace(':trainerUserId', encodeURIComponent(trainer.user_id))}>
                        <Eye size={14} />
                        Профиль
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      className="h-11 w-full gap-1.5 sm:h-8 sm:w-auto"
                      onClick={() => onConnect(trainer.user_id)}
                      disabled={createPending || mustCompleteQuestionnaire || isActiveRelationLoading || isActiveRelationError || hasActiveTrainer}
                    >
                      <Link2 size={14} />
                        {createPending ? 'Подключаем…' : hasActiveTrainer ? 'Уже подключён' : 'Подключиться'}
                    </Button>
                  </div>
                </div>
              ))}
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
