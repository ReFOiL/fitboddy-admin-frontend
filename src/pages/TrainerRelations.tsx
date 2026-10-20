import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { InviteClientSheet } from '../components/trainer/InviteClientSheet'
import { QueryState } from '../components/shared'
import { Avatar, Chip, PageTitle, Row, StatusPill } from '../components/ui/kit'
import { Input } from '../components/ui/input'
import { APP_PATHS } from '../config'
import { useAuth } from '../hooks/use-auth'
import { localTodayIso } from '../lib/dates'
import { useTrainerRelations } from '../hooks/use-relations'
import { useTrainerRoster } from '../hooks/use-trainer-roster'
import { clientDisplayName } from '../lib/person'
import { attentionSubtitle, clientListSubtitle, matchesClientFilter, type ClientFilter } from '../lib/roster'

const FILTERS: { id: ClientFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'today', label: 'Сегодня' },
  { id: 'missed', label: 'Пропуски' },
  { id: 'no-plan', label: 'Без плана' },
]

export function TrainerRelationsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const trainerUserId = user?.role === 'trainer' ? user.user_id : ''
  const todayIso = localTodayIso()
  const { rows, clientsQuery } = useTrainerRoster(trainerUserId)
  const relations = useTrainerRelations({ trainerUserId })
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ClientFilter>('all')
  const [inviteOpen, setInviteOpen] = useState(false)

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ru-RU')
    return rows.filter((row) => {
      const name = clientDisplayName(row.relation).toLocaleLowerCase('ru-RU')
      const login = row.relation.client_login?.toLocaleLowerCase('ru-RU') ?? ''
      const matchesSearch = !query || name.includes(query) || login.includes(query)
      return matchesSearch && matchesClientFilter(filter, { planState: row.planState, plan: row.plan, todayIso })
    })
  }, [filter, rows, search, todayIso])

  return (
    <div className="mx-auto w-full max-w-3xl pb-24">
      <PageTitle>Клиенты · {rows.length}</PageTitle>
      <div className="mt-4">
        <Input
          value={search}
          aria-label="Найти клиента"
          placeholder="Найти клиента"
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((item) => (
          <Chip key={item.id} active={filter === item.id} onClick={() => setFilter(item.id)}>
            {item.label}
          </Chip>
        ))}
      </div>

      {clientsQuery.isLoading ? <p className="mt-6 text-[17px]">Загрузка…</p> : null}
      {clientsQuery.isError ? (
        <QueryState isError errorTitle="Не удалось загрузить клиентов" onRetry={() => void clientsQuery.refetch()}>
          {null}
        </QueryState>
      ) : null}

      <div className="mt-2">
        {visible.map((row) => {
          const name = clientDisplayName(row.relation)
          const missed = Boolean(attentionSubtitle({ ...row, todayIso, createdAt: row.relation.created_at }) && row.planState === 'ready')
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
              trailing={
                row.planState === 'missing' ? (
                  <StatusPill tone="neutral">Нет плана</StatusPill>
                ) : missed ? (
                  <StatusPill tone="danger">Пропуски</StatusPill>
                ) : null
              }
              onClick={() => {
                const params = new URLSearchParams({ clientUserId: row.relation.client_user_id })
                if (row.planState === 'missing') params.set('screen', 'plan')
                else if (missed) params.set('screen', 'progress')
                navigate(`${APP_PATHS.clientProfile}?${params.toString()}`)
              }}
            />
          )
        })}
        {!clientsQuery.isLoading && visible.length === 0 ? <p className="px-1 py-6 text-[17px]">Никого не нашли</p> : null}
      </div>

      <button type="button" className="mt-6 text-[17px] font-semibold underline" onClick={() => setInviteOpen(true)}>
        + Пригласить клиента
      </button>

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
