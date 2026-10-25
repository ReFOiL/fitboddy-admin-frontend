import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { QueryState } from '../components/shared'
import { Button } from '../components/ui/button'
import { Avatar, Chip, PageTitle, StatusPill } from '../components/ui/kit'
import { Input } from '../components/ui/input'
import { APP_PATHS, clientPlanPath } from '../config'
import { useAuth } from '../hooks/use-auth'
import { localTodayIso } from '../lib/dates'
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
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ClientFilter>('all')

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
    <div className="mx-auto w-full max-w-3xl pb-28">
      <div className="mb-4 hidden md:flex md:justify-end">
        <Button asChild size="lg" className="h-12">
          <Link to={APP_PATHS.trainerInvite}>Пригласить</Link>
        </Button>
      </div>
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
            <div key={row.relation.relation_id} className="flex min-h-16 items-center gap-3 border-b border-border py-2">
              <button
                type="button"
                className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-left"
                onClick={() => {
                  const params = new URLSearchParams({ clientUserId: row.relation.client_user_id })
                  if (row.planState === 'missing') params.set('screen', 'plan')
                  else if (missed) params.set('screen', 'progress')
                  navigate(`${APP_PATHS.clientProfile}?${params.toString()}`)
                }}
              >
                <Avatar name={name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] font-semibold">{name}</span>
                  <span className="mt-0.5 block truncate text-[15px] text-secondary-foreground">
                    {clientListSubtitle({
                      planState: row.planState,
                      plan: row.plan,
                      todayIso,
                      createdAt: row.relation.created_at,
                    })}
                  </span>
                </span>
                {row.planState === 'missing' ? (
                  <StatusPill tone="neutral">Нет плана</StatusPill>
                ) : missed ? (
                  <StatusPill tone="danger">Пропуски</StatusPill>
                ) : null}
              </button>
              <Button asChild className="h-12 shrink-0 px-4">
                <Link to={clientPlanPath(row.relation.client_user_id)}>План</Link>
              </Button>
            </div>
          )
        })}
        {!clientsQuery.isLoading && visible.length === 0 ? <p className="px-1 py-6 text-[17px]">Никого не нашли</p> : null}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 border-t border-border bg-card px-4 py-3 md:hidden">
        <Button asChild size="lg" className="h-12 w-full">
          <Link to={APP_PATHS.trainerInvite}>Пригласить</Link>
        </Button>
      </div>
    </div>
  )
}
