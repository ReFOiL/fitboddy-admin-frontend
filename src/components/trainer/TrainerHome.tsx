import { ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { APP_PATHS, clientProfilePath } from '../../config'
import { useAuth } from '../../hooks/use-auth'
import { useTrainerRoster } from '../../hooks/use-trainer-roster'
import { formatHeadingDate, localTodayIso } from '../../lib/dates'
import { clientDisplayName } from '../../lib/person'
import { attentionSubtitle, clientListSubtitle, todayPlanDay, trainingTodaySubtitle } from '../../lib/roster'
import { Input } from '../ui/input'
import { Avatar, DoneMark, PageTitle, Row, SectionLabel, StatusPill } from '../ui/kit'
import { QueryState } from '../shared'

function createPlanHint(clientCount: number, missingCount: number): string {
  if (clientCount === 0) return 'Сначала пригласите клиента'
  if (missingCount === 1) return 'У одного клиента ещё нет плана'
  if (missingCount > 1) return 'Несколько клиентов без плана'
  return 'Открыть клиента и составить план'
}

export function TrainerHome() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const trainerUserId = user?.role === 'trainer' ? user.user_id : ''
  const todayIso = localTodayIso()
  const todayLabel = formatHeadingDate(new Date())
  const { rows, clientsQuery } = useTrainerRoster(trainerUserId)
  const [search, setSearch] = useState('')

  const training = rows.filter((row) => row.planState === 'ready' && todayPlanDay(row.plan, todayIso))
  const attention = rows.filter((row) => attentionSubtitle({ ...row, todayIso, createdAt: row.relation.created_at }))
  const missing = rows.filter((row) => row.planState === 'missing')
  const visibleClients = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ru-RU')
    if (!query) return rows
    return rows.filter((row) => clientDisplayName(row.relation).toLocaleLowerCase('ru-RU').includes(query))
  }, [rows, search])

  const openClient = (clientUserId: string, screen: 'plan' | 'progress' = 'plan') => {
    const params = new URLSearchParams({ clientUserId })
    if (screen === 'progress') params.set('screen', 'progress')
    navigate(`${APP_PATHS.clientProfile}?${params.toString()}`)
  }

  const openCreatePlan = () => {
    if (missing.length === 1) {
      navigate(clientProfilePath(missing[0].relation.client_user_id))
      return
    }
    const filter = missing.length > 1 ? '?filter=no-plan' : ''
    navigate(`${APP_PATHS.clients}${filter}`)
  }

  return (
    <div className="mx-auto w-full max-w-6xl pb-8">
      <PageTitle>{todayLabel}</PageTitle>

      <section className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link
          to={APP_PATHS.trainerInvite}
          className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-semibold">Пригласить клиента</span>
            <span className="mt-0.5 block text-[15px] text-secondary-foreground">Ссылка, которой вы делитесь</span>
          </span>
          <ChevronRight aria-hidden size={18} className="shrink-0 text-secondary-foreground" />
        </Link>
        <button
          type="button"
          className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          onClick={openCreatePlan}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-semibold">Создать план</span>
            <span className="mt-0.5 block text-[15px] text-secondary-foreground">
              {createPlanHint(rows.length, missing.length)}
            </span>
          </span>
          <ChevronRight aria-hidden size={18} className="shrink-0 text-secondary-foreground" />
        </button>
      </section>

      {clientsQuery.isLoading ? <p className="mt-6 text-[17px]">Загрузка…</p> : null}
      {clientsQuery.isError ? (
        <QueryState isError errorTitle="Не удалось загрузить клиентов" onRetry={() => void clientsQuery.refetch()}>
          {null}
        </QueryState>
      ) : null}

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-8">
          <section className="space-y-1">
            <SectionLabel>Тренируются сегодня · {training.length}</SectionLabel>
            {training.length === 0 && !clientsQuery.isLoading ? (
              <p className="px-1 py-4 text-[17px]">Сегодня тренировок нет</p>
            ) : null}
            {training.map((row) => {
              const day = todayPlanDay(row.plan, todayIso)
              if (!day) return null
              const name = clientDisplayName(row.relation)
              return (
                <Row
                  key={row.relation.relation_id}
                  title={name}
                  subtitle={trainingTodaySubtitle(day)}
                  titleAdornment={day.is_completed ? <DoneMark /> : null}
                  leading={<Avatar name={name} />}
                  onClick={() => openClient(row.relation.client_user_id)}
                />
              )
            })}
          </section>

          <section className="space-y-1">
            <SectionLabel>Нужно внимание · {attention.length}</SectionLabel>
            {attention.length === 0 && !clientsQuery.isLoading ? (
              <p className="px-1 py-4 text-[17px]">Нет пропусков и клиентов без плана</p>
            ) : null}
            {attention.map((row) => {
              const name = clientDisplayName(row.relation)
              const missed = row.planState === 'ready' && row.plan ? attentionSubtitle({ ...row, todayIso, createdAt: row.relation.created_at }) : null
              const noPlan = row.planState === 'missing'
              return (
                <Row
                  key={row.relation.relation_id}
                  title={name}
                  subtitle={attentionSubtitle({ ...row, todayIso, createdAt: row.relation.created_at }) ?? ''}
                  leading={<Avatar name={name} />}
                  trailing={
                    noPlan ? <StatusPill tone="neutral">Нет плана</StatusPill> : missed ? <StatusPill tone="danger">Пропуски</StatusPill> : null
                  }
                  onClick={() => openClient(row.relation.client_user_id, noPlan ? 'plan' : 'progress')}
                />
              )
            })}
          </section>
        </div>

        <section className="hidden lg:block">
          <SectionLabel>Все клиенты · {rows.length}</SectionLabel>
          <div className="mt-3">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти клиента" aria-label="Найти клиента" />
          </div>
          <div className="mt-2">
            {visibleClients.map((row) => {
              const name = clientDisplayName(row.relation)
              return (
                <Row
                  key={row.relation.relation_id}
                  title={name}
                  subtitle={clientListSubtitle({
                    planState: row.planState,
                    plan: row.plan,
                    todayIso,
                    createdAt: row.relation.created_at,
                  })}
                  leading={<Avatar name={name} />}
                  onClick={() => openClient(row.relation.client_user_id)}
                />
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
