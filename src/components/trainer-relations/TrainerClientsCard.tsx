import { ChevronLeft, ChevronRight, Search, Users } from 'lucide-react'

import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Skeleton } from '../ui/skeleton'
import type { TrainerClientRelation } from '../../types/relation'
import { TrainerClientItem } from './TrainerClientItem'

type TrainerClientsCardProps = {
  searchValue: string
  onSearchChange: (value: string) => void
  total: number
  page: number
  totalPages: number
  rangeStart: number
  rangeEnd: number
  isLoading: boolean
  isError: boolean
  clients: TrainerClientRelation[]
  leaveDisabled: boolean
  onLeaveClient: (relationId: string) => void
  onClearSearch: () => void
  onPrevPage: () => void
  onNextPage: () => void
}

export function TrainerClientsCard({
  searchValue,
  onSearchChange,
  total,
  page,
  totalPages,
  rangeStart,
  rangeEnd,
  isLoading,
  isError,
  clients,
  leaveDisabled,
  onLeaveClient,
  onClearSearch,
  onPrevPage,
  onNextPage,
}: TrainerClientsCardProps) {
  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="border-b border-border/60 bg-gradient-to-b from-primary/10 to-transparent">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users size={18} className="text-primary" />
              Клиенты
            </CardTitle>
            <CardDescription className="mt-1">Управляйте текущими клиентами.</CardDescription>
          </div>
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {total}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="rounded-xl border border-border/70 bg-secondary/20 p-3">
          <label htmlFor="trainer_clients_search" className="mb-2 block text-xs font-medium text-secondary-foreground">
            Поиск клиента
          </label>
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary-foreground" />
            <Input
              id="trainer_clients_search"
              className="pl-9"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Имя или логин"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-secondary/15 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-xs text-secondary-foreground">
            <span>
              Показано {rangeStart}-{rangeEnd} из {total}
            </span>
            <span>
              Страница {page} из {totalPages}
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
          ) : null}
          {isError ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Не удалось загрузить список активных клиентов.
            </div>
          ) : null}
          {!isLoading && !isError ? (
            <>
              <div className="space-y-2.5">
                {clients.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 bg-secondary/20 px-4 py-4 text-sm text-secondary-foreground">
                    <span>По текущим фильтрам клиентов не найдено.</span>
                    {searchValue.trim() ? (
                      <Button size="sm" variant="secondary" className="mt-3 w-full sm:w-auto" onClick={onClearSearch}>
                        Очистить поиск
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  clients.map((relation) => (
                    <TrainerClientItem
                      key={relation.relation_id}
                      relation={relation}
                      leaveDisabled={leaveDisabled}
                      onLeave={onLeaveClient}
                    />
                  ))
                )}
              </div>

              <div className="mt-3 rounded-xl border border-border/70 bg-secondary/20 px-3 py-3 text-xs text-secondary-foreground">
                <div className="mb-2 text-center">
                  Страница {page} из {totalPages}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="secondary" onClick={onPrevPage} disabled={page <= 1} className="w-full">
                    <ChevronLeft size={14} />
                    Назад
                  </Button>
                  <Button size="sm" variant="secondary" onClick={onNextPage} disabled={page >= totalPages} className="w-full">
                    Вперед
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
