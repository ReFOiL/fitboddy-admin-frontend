import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { TrainerClientsCard } from '../components/trainer-relations/TrainerClientsCard'
import { Button } from '../components/ui/button'
import { PageTitle } from '../components/ui/kit'
import { APP_PATHS, clientProfilePath } from '../config'
import { useAuth } from '../hooks/use-auth'
import { localTodayIso } from '../lib/dates'
import { useTrainerRoster } from '../hooks/use-trainer-roster'
import { useMinWidth } from '../lib/use-min-width'
import { clientRosterFacts, matchesClientFilter, type ClientFilter } from '../lib/roster'
import { clientDisplayName } from '../lib/person'

function readFilter(value: string | null): ClientFilter {
  if (value === 'today' || value === 'missed' || value === 'no-plan' || value === 'all') return value
  return 'all'
}

export function TrainerRelationsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const trainerUserId = user?.role === 'trainer' ? user.user_id : ''
  const todayIso = localTodayIso()
  const wide = useMinWidth(1024)
  const { rows, clientsQuery } = useTrainerRoster(trainerUserId)
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ClientFilter>(() => readFilter(searchParams.get('filter')))

  const searched = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ru-RU')
    return rows.filter((row) => {
      const name = clientDisplayName(row.relation).toLocaleLowerCase('ru-RU')
      const login = row.relation.client_login?.toLocaleLowerCase('ru-RU') ?? ''
      return !query || name.includes(query) || login.includes(query)
    })
  }, [rows, search])

  const counts = useMemo(
    () => ({
      all: searched.length,
      today: searched.filter((row) => matchesClientFilter('today', { planState: row.planState, plan: row.plan, todayIso })).length,
      missed: searched.filter((row) => matchesClientFilter('missed', { planState: row.planState, plan: row.plan, todayIso })).length,
      'no-plan': searched.filter((row) => matchesClientFilter('no-plan', { planState: row.planState, plan: row.plan, todayIso })).length,
    }),
    [searched, todayIso],
  )

  const visible = useMemo(
    () =>
      searched
        .filter((row) => matchesClientFilter(filter, { planState: row.planState, plan: row.plan, todayIso }))
        .map((row) => ({
          relation: row.relation,
          facts: clientRosterFacts({ planState: row.planState, plan: row.plan, todayIso }),
        })),
    [filter, searched, todayIso],
  )

  return (
    <div className="w-full pb-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <PageTitle>Клиенты · {rows.length}</PageTitle>
          <p className="mt-1 hidden text-[15px] text-secondary-foreground lg:block">Нажмите строку, чтобы открыть студию плана.</p>
        </div>
        <Button asChild size="lg" className="h-12 shrink-0 lg:h-14">
          <Link to={APP_PATHS.trainerInvite}>{wide ? 'Пригласить клиента' : 'Пригласить'}</Link>
        </Button>
      </div>

      <TrainerClientsCard
        todayIso={todayIso}
        searchValue={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        counts={counts}
        items={visible}
        isLoading={clientsQuery.isLoading}
        isError={clientsQuery.isError}
        onRetry={() => void clientsQuery.refetch()}
        onOpenClient={(clientUserId) => navigate(clientProfilePath(clientUserId))}
      />
    </div>
  )
}
