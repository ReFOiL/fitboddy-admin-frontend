import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { QueryState } from '../components/shared'
import { ScreenHeader } from '../components/ui/kit'
import { PageSkeleton } from '../components/ui/skeleton'
import { useTrainerRelations } from '../hooks'
import { useAuth } from '../hooks/use-auth'
import { formatMetricCount, formatMetricPercent } from '../lib/metrics'
import type { TrainerFunnelMetrics } from '../types/relation'

type Metric = {
  key: string
  label: string
  value: string
  hint: string
  bar?: number
}

function barWidth(part: number, whole: number): number {
  if (whole <= 0 || part <= 0) return 0
  return Math.min(100, (part / whole) * 100)
}

function funnelMetrics(funnel: TrainerFunnelMetrics): { stages: Metric[]; rest: Metric[] } {
  const sent = funnel.invites_sent
  const stages: Metric[] = [
    {
      key: 'invited',
      label: 'Приглашены',
      value: formatMetricCount(funnel.invites_sent),
      hint: 'Сколько приглашений вы отправили.',
      bar: barWidth(funnel.invites_sent, sent),
    },
    {
      key: 'accepted',
      label: 'Приняли',
      value: formatMetricCount(funnel.invites_accepted),
      hint: 'Сколько приглашений клиенты приняли.',
      bar: barWidth(funnel.invites_accepted, sent),
    },
    {
      key: 'active',
      label: 'Активны',
      value: formatMetricCount(funnel.active_clients),
      hint: 'Сколько клиентов сейчас занимаются с вами.',
      bar: barWidth(funnel.active_clients, sent),
    },
  ]
  const rest: Metric[] = [
    {
      key: 'pending',
      label: 'Ожидают ответа',
      value: formatMetricCount(funnel.invites_pending),
      hint: 'Приглашения, на которые ещё нет ответа.',
    },
    {
      key: 'declined',
      label: 'Отклонили',
      value: formatMetricCount(funnel.invites_declined),
      hint: 'Сколько приглашений клиенты отклонили.',
    },
    {
      key: 'conversion',
      label: 'Конверсия',
      value: formatMetricPercent(funnel.invite_acceptance_rate),
      hint: 'Доля принятых приглашений среди отправленных, в процентах.',
    },
  ]
  return { stages, rest }
}

function MetricRow({ metric }: { metric: Metric }) {
  const [open, setOpen] = useState(false)
  const hintId = useId()
  return (
    <div className="border-b border-border py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center">
          <span className="text-[17px]">{metric.label}</span>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[15px] font-semibold text-secondary-foreground"
            aria-expanded={open}
            aria-controls={hintId}
            aria-label={`Что считает «${metric.label}»`}
            onClick={() => setOpen((current) => !current)}
          >
            ?
          </button>
        </div>
        <span className="text-[22px] font-bold tabular-nums">{metric.value}</span>
      </div>
      {metric.bar != null ? (
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary" aria-hidden>
          <div className="h-full rounded-full bg-primary" style={{ width: `${metric.bar}%` }} />
        </div>
      ) : null}
      {open ? (
        <p id={hintId} className="mt-1 text-[15px] text-secondary-foreground">
          {metric.hint}
        </p>
      ) : null}
    </div>
  )
}

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

  // Период 7 / 30 / всё время не показываем: у воронки нет параметра периода.
  const metrics = trainerFunnel ? funnelMetrics(trainerFunnel) : null

  return (
    <div className="mx-auto max-w-lg">
      <ScreenHeader title="Аналитика" onBack={() => navigate(-1)} />
      <QueryState
        isLoading={trainerFunnelQuery.isLoading}
        isError={trainerFunnelQuery.isError}
        isEmpty={!metrics}
        loadingFallback={<PageSkeleton />}
        errorTitle="Не удалось загрузить аналитику"
        onRetry={() => void trainerFunnelQuery.refetch()}
      >
        {metrics ? (
          <div className="mt-4">
            <h2 className="text-[17px] font-semibold">Приглашены → Приняли → Активны</h2>
            {metrics.stages.map((metric) => (
              <MetricRow key={metric.key} metric={metric} />
            ))}
            <div className="mt-4">
              {metrics.rest.map((metric) => (
                <MetricRow key={metric.key} metric={metric} />
              ))}
            </div>
          </div>
        ) : null}
      </QueryState>
    </div>
  )
}
