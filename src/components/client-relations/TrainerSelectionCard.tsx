import { Link2, Search, Users } from 'lucide-react'

import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Skeleton } from '../ui/skeleton'
import { AsyncTextState } from '../shared/AsyncState'
import { formatRelationIdentity } from '../../lib/relations-formatters'
import type { DiscoveryProfile } from '../../types/relation'

type TrainerSelectionCardProps = {
  trainers: DiscoveryProfile[]
  isLoading: boolean
  isError: boolean
  hasActiveTrainer: boolean
  isActiveRelationLoading: boolean
  isActiveRelationError: boolean
  mustCompleteQuestionnaire: boolean
  createPending: boolean
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
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : null}
        {isError ? <AsyncTextState tone="destructive">Не удалось загрузить список тренеров.</AsyncTextState> : null}
        {!isLoading && !isError ? (
          <div className="space-y-3">
            {trainers.length === 0 ? (
              <AsyncTextState>Пока нет доступных тренеров.</AsyncTextState>
            ) : (
              trainers.map((trainer) => (
                <div key={trainer.user_id} className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-4 text-sm">
                  <div className="mb-1 flex items-center gap-2">
                    <Users size={16} className="text-primary" />
                    <span className="font-medium">Тренер</span>
                  </div>
                  <div className="mb-3 text-secondary-foreground">{formatRelationIdentity({ login: trainer.login, userId: trainer.user_id })}</div>
                  <div className="mb-3 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary">
                    Профиль подтвержден
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onConnect(trainer.user_id)}
                    disabled={createPending || mustCompleteQuestionnaire || isActiveRelationLoading || isActiveRelationError || hasActiveTrainer}
                  >
                    <Link2 size={14} />
                    {createPending ? 'Подключаем...' : hasActiveTrainer ? 'Уже подключен' : 'Подключиться'}
                  </Button>
                </div>
              ))
            )}
          </div>
        ) : null}
        {!isActiveRelationLoading && !isActiveRelationError && hasActiveTrainer ? (
          <AsyncTextState>
            Активная связь уже есть. Завершите текущую связь, чтобы выбрать другого тренера.
          </AsyncTextState>
        ) : null}
        {isActiveRelationError ? <AsyncTextState tone="destructive">Не удалось проверить активную связь с тренером.</AsyncTextState> : null}
      </CardContent>
    </Card>
  )
}
