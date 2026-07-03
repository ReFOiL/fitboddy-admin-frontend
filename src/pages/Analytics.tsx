import { BarChart3 } from 'lucide-react'

import { useAuth } from '../hooks/use-auth'
import { useTrainerRelations } from '../hooks/use-relations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'

export function AnalyticsPage() {
  const { user } = useAuth()
  const isTrainer = user?.role === 'trainer'
  const trainerUserId = isTrainer && user?.user_id ? user.user_id : ''
  const { trainerFunnelQuery } = useTrainerRelations({ trainerUserId })
  const trainerFunnel = trainerFunnelQuery.data

  if (!isTrainer) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 size={18} className="text-primary" />
            Аналитика
          </CardTitle>
          <CardDescription>Этот раздел доступен только тренерам.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 size={18} className="text-primary" />
            Бизнес метрики
          </CardTitle>
          <CardDescription>Бизнес-метрики по приглашениям и текущей базе клиентов.</CardDescription>
        </CardHeader>
        <CardContent>
          {trainerFunnelQuery.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : null}
          {trainerFunnelQuery.isError ? (
            <span className="text-sm text-destructive">Не удалось загрузить бизнес-метрики.</span>
          ) : null}
          {!trainerFunnelQuery.isLoading && !trainerFunnelQuery.isError && trainerFunnel ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-border/70 bg-secondary/30 p-3">
                <div className="text-xs text-secondary-foreground">Отправлено приглашений</div>
                <div className="text-xl font-semibold">{trainerFunnel.invites_sent}</div>
              </div>
              <div className="rounded-xl border border-border/70 bg-secondary/30 p-3">
                <div className="text-xs text-secondary-foreground">Ожидают ответа</div>
                <div className="text-xl font-semibold">{trainerFunnel.invites_pending}</div>
              </div>
              <div className="rounded-xl border border-border/70 bg-secondary/30 p-3">
                <div className="text-xs text-secondary-foreground">Принято приглашений</div>
                <div className="text-xl font-semibold">{trainerFunnel.invites_accepted}</div>
              </div>
              <div className="rounded-xl border border-border/70 bg-secondary/30 p-3">
                <div className="text-xs text-secondary-foreground">Отклонено приглашений</div>
                <div className="text-xl font-semibold">{trainerFunnel.invites_declined}</div>
              </div>
              <div className="rounded-xl border border-border/70 bg-secondary/30 p-3">
                <div className="text-xs text-secondary-foreground">Активных клиентов</div>
                <div className="text-xl font-semibold">{trainerFunnel.active_clients}</div>
              </div>
              <div className="rounded-xl border border-primary/40 bg-primary/10 p-3">
                <div className="text-xs text-primary/90">Конверсия приглашений</div>
                <div className="text-xl font-semibold text-primary">{trainerFunnel.invite_acceptance_rate}%</div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
