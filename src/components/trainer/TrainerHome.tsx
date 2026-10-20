import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { APP_PATHS } from '../../config'
import { useAuth } from '../../hooks/use-auth'
import { useTrainerRelations } from '../../hooks/use-relations'
import { useTrainerRoster } from '../../hooks/use-trainer-roster'
import { formatHeadingDate, localTodayIso } from '../../lib/dates'
import { clientDisplayName } from '../../lib/person'
import { attentionSubtitle, clientListSubtitle, todayPlanDay, trainingTodaySubtitle } from '../../lib/roster'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Avatar, DoneMark, PageTitle, Row, SectionLabel, StatusPill } from '../ui/kit'
import { QueryState } from '../shared'
import { InviteClientSheet } from './InviteClientSheet'

export function TrainerHome() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const trainerUserId = user?.role === 'trainer' ? user.user_id : ''
  const todayIso = localTodayIso()
  const todayLabel = formatHeadingDate(new Date())
  const { rows, clientsQuery } = useTrainerRoster(trainerUserId)
  const relations = useTrainerRelations({ trainerUserId })
  const [inviteOpen, setInviteOpen] = useState(false)
  const [search, setSearch] = useState('')

  const training = rows.filter((row) => row.planState === 'ready' && todayPlanDay(row.plan, todayIso))
  const attention = rows.filter((row) => attentionSubtitle({ ...row, todayIso, createdAt: row.relation.created_at }))
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

  return (
    <div className="mx-auto w-full max-w-6xl pb-24 md:pb-0">
      <div className="mb-6 hidden items-start justify-between gap-4 md:flex">
        <PageTitle>{todayLabel}</PageTitle>
        <Button type="button" size="lg" onClick={() => setInviteOpen(true)}>
          + Пригласить клиента
        </Button>
      </div>
      <div className="md:hidden">
        <PageTitle>{todayLabel}</PageTitle>
      </div>

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
                  onClick={() => openClient(row.relation.client_user_id, row.planState === 'missing' ? 'plan' : 'plan')}
                />
              )
            })}
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 bg-background px-4 py-3 md:hidden">
        <Button type="button" size="lg" className="w-full" onClick={() => setInviteOpen(true)}>
          + Пригласить клиента
        </Button>
      </div>
      {inviteOpen ? (
        <InviteClientSheet
          trainerUserId={trainerUserId}
          pending={relations.createRelationMutation.isPending}
          published={Boolean(relations.trainerPublicationStatusQuery.data?.is_published)}
          publicationPending={relations.upsertDiscoveryProfileMutation.isPending}
          onTogglePublication={() =>
            relations.upsertDiscoveryProfileMutation.mutate({
              userId: trainerUserId,
              payload: { role: 'trainer', is_visible: !relations.trainerPublicationStatusQuery.data?.is_published },
            })
          }
          onClose={() => setInviteOpen(false)}
          onInvite={(clientUserId) =>
            relations.createRelationMutation.mutate(
              { trainer_user_id: trainerUserId, client_user_id: clientUserId, mode: 'invite' },
              { onSuccess: () => setInviteOpen(false) },
            )
          }
        />
      ) : null}
    </div>
  )
}
