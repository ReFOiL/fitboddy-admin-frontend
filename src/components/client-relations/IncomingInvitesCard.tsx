import { Check, Sparkles, Users, X } from 'lucide-react'

import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Skeleton } from '../ui/skeleton'
import { EmptyState, QueryState } from '../shared'
import { formatRelationIdentity } from '../../lib/relations-formatters'
import type { TrainerClientRelation } from '../../types/relation'

type IncomingInvitesCardProps = {
  invites: TrainerClientRelation[]
  isLoading: boolean
  isError: boolean
  acceptPending: boolean
  declinePending: boolean
  onRetry: () => void
  onAccept: (relationId: string) => void
  onDecline: (relationId: string) => void
}

export function IncomingInvitesCard({
  invites,
  isLoading,
  isError,
  acceptPending,
  declinePending,
  onRetry,
  onAccept,
  onDecline,
}: IncomingInvitesCardProps) {
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          Входящие приглашения
        </CardTitle>
        <CardDescription>Тренеры, которые пригласили вас в сопровождение.</CardDescription>
      </CardHeader>
      <CardContent>
        <QueryState
          isLoading={isLoading}
          isError={isError}
          isEmpty={invites.length === 0}
          onRetry={onRetry}
          errorTitle="Не удалось загрузить приглашения"
          loadingFallback={<div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>}
          emptyFallback={<EmptyState className="py-7" title="Новых приглашений пока нет" />}
        >
          <div className="space-y-3">
            {invites.map((invite) => (
                <div key={invite.relation_id} className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-4 text-sm">
                  <div className="mb-1 flex items-center gap-2">
                    <Users size={16} className="text-primary" />
                    <span className="font-medium">Тренер: {formatRelationIdentity({ login: invite.trainer_login, userId: invite.trainer_user_id })}</span>
                  </div>
                  <div className="mb-3 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary">
                    Статус: приглашение
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <Button
                      size="sm"
                      className="h-11 w-full gap-1.5 sm:h-8 sm:w-auto"
                      onClick={() => onAccept(invite.relation_id)}
                      disabled={acceptPending}
                    >
                      <Check size={14} />
                      Принять
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-11 w-full gap-1.5 sm:h-8 sm:w-auto"
                      onClick={() => onDecline(invite.relation_id)}
                      disabled={declinePending}
                    >
                      <X size={14} />
                      Отклонить
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </QueryState>
      </CardContent>
    </Card>
  )
}
