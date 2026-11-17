import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { formatDayMonth } from '../../lib/dates'
import { clientDisplayName } from '../../lib/person'
import {
  clientStatusLabel,
  type ClientFilter,
  type ClientRosterFacts,
  type ClientRosterHighlight,
  type ClientRosterStatus,
} from '../../lib/roster'
import { useMinWidth } from '../../lib/use-min-width'
import { cn } from '../../lib/utils'
import type { TrainerClientRelation } from '../../types/relation'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Avatar, Chip } from '../ui/kit'
import { AsyncTextState } from '../shared'

export type RosterListItem = {
  relation: TrainerClientRelation
  facts: ClientRosterFacts
}

type SortKey = 'name' | 'status' | 'until' | 'last' | 'missed'
type SortDir = 'asc' | 'desc'

const FILTERS: { id: ClientFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'today', label: 'Сегодня' },
  { id: 'missed', label: 'Пропуски' },
  { id: 'no-plan', label: 'Без плана' },
]

const STATUS_RANK: Record<ClientRosterStatus, number> = {
  missed: 0,
  active: 1,
  'no-plan': 2,
  loading: 3,
  error: 4,
}

type TrainerClientsCardProps = {
  todayIso: string
  searchValue: string
  onSearchChange: (value: string) => void
  filter: ClientFilter
  onFilterChange: (filter: ClientFilter) => void
  counts: Record<ClientFilter, number>
  items: RosterListItem[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  onOpenClient: (clientUserId: string) => void
}

export function TrainerClientsCard({
  todayIso,
  searchValue,
  onSearchChange,
  filter,
  onFilterChange,
  counts,
  items,
  isLoading,
  isError,
  onRetry,
  onOpenClient,
}: TrainerClientsCardProps) {
  const wide = useMinWidth(1024)
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'until', dir: 'asc' })
  const sorted = useMemo(() => sortItems(items, sort), [items, sort])

  const toggleSort = (key: SortKey) => {
    setSort((current) => (current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  return (
    <div>
      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary-foreground" />
          <Input
            value={searchValue}
            aria-label="Найти клиента"
            placeholder="Найти клиента"
            className="pl-10"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <div className="-mx-4 flex flex-nowrap gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0" aria-label="Фильтр клиентов">
          {FILTERS.map((item) => (
            <Chip
              key={item.id}
              active={filter === item.id}
              aria-label={`${item.label} ${counts[item.id]}`}
              className="h-10 shrink-0 gap-1 whitespace-nowrap px-2.5 text-[13px] lg:h-12 lg:gap-2 lg:px-4 lg:text-[15px]"
              onClick={() => onFilterChange(item.id)}
            >
              {item.label}
              <span aria-hidden className="font-semibold text-secondary-foreground">
                {counts[item.id]}
              </span>
            </Chip>
          ))}
        </div>
      </div>

      {isLoading ? <p className="mt-6 text-[17px]">Загрузка…</p> : null}
      {isError ? (
        <div className="mt-4">
          <AsyncTextState tone="destructive">Не удалось загрузить список активных клиентов.</AsyncTextState>
          <Button type="button" variant="secondary" className="mt-3" onClick={onRetry}>
            Повторить
          </Button>
        </div>
      ) : null}

      {!isLoading && !isError && sorted.length === 0 ? <p className="px-1 py-6 text-[17px]">Никого не нашли</p> : null}

      {!isLoading && !isError && sorted.length > 0 && !wide ? (
        <div className="mt-3 grid gap-2">
          {sorted.map((item) => (
            <ClientCard key={item.relation.relation_id} item={item} todayIso={todayIso} onOpen={() => onOpenClient(item.relation.client_user_id)} />
          ))}
        </div>
      ) : null}

      {!isLoading && !isError && sorted.length > 0 && wide ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="bg-secondary/40 text-[13px]">
                <tr>
                  <SortHeader label="Клиент" sortKey="name" sort={sort} onSort={toggleSort} />
                  <SortHeader label="Статус" sortKey="status" sort={sort} onSort={toggleSort} />
                  <SortHeader label="План до" sortKey="until" sort={sort} onSort={toggleSort} />
                  <SortHeader label="Последняя тренировка" sortKey="last" sort={sort} onSort={toggleSort} />
                  <SortHeader label="Пропуски" sortKey="missed" sort={sort} onSort={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => (
                  <ClientTableRow
                    key={item.relation.relation_id}
                    item={item}
                    todayIso={todayIso}
                    onOpen={() => onOpenClient(item.relation.client_user_id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border bg-secondary/20 px-4 py-2.5 text-[13px] text-secondary-foreground">
            <span>
              Показано 1–{sorted.length} из {sorted.length}
            </span>
            <span>Строка открывает студию плана</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey: SortKey
  sort: { key: SortKey; dir: SortDir }
  onSort: (key: SortKey) => void
}) {
  const active = sort.key === sortKey
  return (
    <th className="h-12 whitespace-nowrap px-4 font-bold" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="inline-flex items-center gap-1" onClick={() => onSort(sortKey)}>
        {label}
        {active ? sort.dir === 'asc' ? <ChevronUp aria-hidden size={14} className="text-primary" /> : <ChevronDown aria-hidden size={14} className="text-primary" /> : null}
      </button>
    </th>
  )
}

function ClientTableRow({ item, todayIso, onOpen }: { item: RosterListItem; todayIso: string; onOpen: () => void }) {
  const name = clientDisplayName(item.relation)
  const { facts } = item
  return (
    <tr
      role="button"
      tabIndex={0}
      className={cn('cursor-pointer border-b border-border last:border-b-0', toneClass(facts.highlight))}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
    >
      <td className="px-4 py-3">
        <span className="flex items-center gap-3">
          <Avatar name={name} className="h-10 w-10 text-[13px]" />
          <span className="min-w-0">
            <span className="line-clamp-2 block text-[17px] font-semibold leading-snug">{name}</span>
            {facts.tag ? <span className={cn('mt-0.5 block text-[13px] font-semibold', tagClass(facts.highlight))}>{facts.tag}</span> : null}
          </span>
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusText status={facts.status} />
      </td>
      <td className={cn('px-4 py-3 text-[15px] font-semibold tabular-nums', facts.highlight === 'ending' && 'font-bold text-warning')}>
        {facts.planUntilIso ? formatDayMonth(facts.planUntilIso, 'long') : '—'}
      </td>
      <td className={cn('px-4 py-3 text-[15px]', facts.highlight === 'absent' && facts.lastWorkoutIso && 'font-bold text-destructive')}>
        {formatLast(facts.lastWorkoutIso, todayIso, 'long')}
      </td>
      <td className={cn('px-4 py-3 text-[15px] font-semibold tabular-nums', (facts.missedCount ?? 0) > 0 && 'font-bold text-destructive')}>
        {facts.missedCount == null ? '—' : facts.missedCount}
      </td>
    </tr>
  )
}

function ClientCard({ item, todayIso, onOpen }: { item: RosterListItem; todayIso: string; onOpen: () => void }) {
  const name = clientDisplayName(item.relation)
  const { facts } = item
  const noPlan = facts.status === 'no-plan'
  return (
    <button
      type="button"
      className={cn('flex w-full items-start gap-3 rounded-2xl border border-border bg-card px-3 py-3 text-left', toneClass(facts.highlight))}
      onClick={onOpen}
    >
      <Avatar name={name} className="h-10 w-10 text-[13px]" />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-[17px] font-semibold leading-snug">{name}</span>
          <StatusText status={facts.status} />
        </span>
        {noPlan ? (
          <span className="mt-1 block text-[15px] text-secondary-foreground">Плана пока нет</span>
        ) : (
          <span className="mt-2 grid grid-cols-3 gap-2 text-[13px]">
            <Metric label="План до" value={facts.planUntilIso ? formatDayMonth(facts.planUntilIso, 'short') : '—'} warn={facts.highlight === 'ending'} />
            <Metric
              label="Последняя"
              value={formatLast(facts.lastWorkoutIso, todayIso, 'short')}
              danger={facts.highlight === 'absent' && Boolean(facts.lastWorkoutIso)}
            />
            <Metric label="Пропуски" value={facts.missedCount == null ? '—' : String(facts.missedCount)} danger={(facts.missedCount ?? 0) > 0} />
          </span>
        )}
      </span>
    </button>
  )
}

function Metric({ label, value, warn = false, danger = false }: { label: string; value: string; warn?: boolean; danger?: boolean }) {
  return (
    <span className="min-w-0">
      <span className="block text-secondary-foreground">{label}</span>
      <span className={cn('block truncate font-semibold', warn && 'text-warning', danger && 'font-bold text-destructive')}>{value}</span>
    </span>
  )
}

function StatusText({ status }: { status: ClientRosterStatus }) {
  const label = clientStatusLabel(status)
  const tone =
    status === 'missed' ? 'border-destructive text-destructive' : status === 'active' ? 'border-success/50 text-success' : 'border-border bg-secondary text-foreground'
  return <span className={cn('inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-[13px] font-semibold', tone)}>{label}</span>
}

function toneClass(highlight: ClientRosterHighlight): string {
  if (highlight === 'ending') return 'bg-warning/10 shadow-[inset_3px_0_0_var(--warning)]'
  if (highlight === 'absent') return 'bg-destructive/10 shadow-[inset_3px_0_0_var(--destructive)]'
  return ''
}

function tagClass(highlight: ClientRosterHighlight): string {
  if (highlight === 'ending') return 'text-warning'
  if (highlight === 'absent') return 'text-destructive'
  return 'text-secondary-foreground'
}

function formatLast(iso: string | null, todayIso: string, style: 'long' | 'short'): string {
  if (!iso) return '—'
  if (iso.slice(0, 10) === todayIso) return style === 'long' ? 'Сегодня' : 'сегодня'
  return formatDayMonth(iso, style)
}

function sortItems(items: RosterListItem[], sort: { key: SortKey; dir: SortDir }): RosterListItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const compared = compareItems(left.item, right.item, sort.key, sort.dir)
      if (compared !== 0) return compared
      return left.index - right.index
    })
    .map((entry) => entry.item)
}

function compareItems(left: RosterListItem, right: RosterListItem, key: SortKey, dir: SortDir): number {
  const sign = dir === 'asc' ? 1 : -1
  switch (key) {
    case 'name':
      return clientDisplayName(left.relation).localeCompare(clientDisplayName(right.relation), 'ru') * sign
    case 'status':
      return (STATUS_RANK[left.facts.status] - STATUS_RANK[right.facts.status]) * sign
    case 'until':
      return compareNullable(left.facts.planUntilIso, right.facts.planUntilIso, sign)
    case 'last':
      return compareNullable(left.facts.lastWorkoutIso, right.facts.lastWorkoutIso, sign)
    case 'missed':
      return compareNullable(left.facts.missedCount, right.facts.missedCount, sign)
    default: {
      const unreachable: never = key
      return unreachable
    }
  }
}

function compareNullable(left: string | number | null, right: string | number | null, sign: number): number {
  if (left == null && right == null) return 0
  if (left == null) return 1
  if (right == null) return -1
  if (typeof left === 'number' && typeof right === 'number') return (left - right) * sign
  return String(left).localeCompare(String(right), 'ru') * sign
}
