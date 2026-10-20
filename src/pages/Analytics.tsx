import { useNavigate } from 'react-router-dom'

import { ScreenHeader } from '../components/ui/kit'
import { useAuth } from '../hooks/use-auth'
import { useTrainerRelations } from '../hooks'

export function AnalyticsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isTrainer = user?.role === 'trainer'
  const trainerUserId = isTrainer && user?.user_id ? user.user_id : ''
  const { trainerFunnelQuery } = useTrainerRelations({ trainerUserId })
  const trainerFunnel = trainerFunnelQuery.data

  if (!isTrainer) {
    return <p className="py-8 text-[17px]">Этот раздел доступен только тренерам.</p>
  }

  const rows = trainerFunnel
    ? [
        ['Отправлено приглашений', String(trainerFunnel.invites_sent)],
        ['Ожидают ответа', String(trainerFunnel.invites_pending)],
        ['Принято приглашений', String(trainerFunnel.invites_accepted)],
        ['Отклонено приглашений', String(trainerFunnel.invites_declined)],
        ['Активных клиентов', String(trainerFunnel.active_clients)],
        ['Конверсия приглашений', `${trainerFunnel.invite_acceptance_rate}%`],
      ]
    : []

  return (
    <div className="mx-auto max-w-lg">
      <ScreenHeader title="Аналитика" onBack={() => navigate(-1)} />
      {trainerFunnelQuery.isLoading ? <p className="mt-4 text-[17px]">Загрузка…</p> : null}
      {trainerFunnelQuery.isError ? <p className="mt-4 text-[17px] text-destructive">Не удалось загрузить бизнес-метрики.</p> : null}
      <div className="mt-2 divide-y divide-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex min-h-16 items-center justify-between gap-3">
            <span className="text-[17px]">{label}</span>
            <span className="text-[22px] font-bold">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
