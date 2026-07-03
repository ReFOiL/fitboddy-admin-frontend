import { Link } from 'react-router-dom'
import { Link2Off, UserCheck } from 'lucide-react'

import { Button } from '../ui/button'
import type { TrainerClientRelation } from '../../types/relation'

type TrainerClientItemProps = {
  relation: TrainerClientRelation
  leaveDisabled: boolean
  onLeave: (relationId: string) => void
}

function formatClientCardTitle(relation: TrainerClientRelation): string {
  return relation.client_display_name?.trim() || relation.client_login?.trim() || 'Клиент'
}

function formatClientCardSubtitle(relation: TrainerClientRelation): string | null {
  const displayName = relation.client_display_name?.trim()
  const login = relation.client_login?.trim()
  if (!displayName || !login) return null
  if (displayName.toLowerCase() === login.toLowerCase()) return null
  return `@${login}`
}

function formatJoinedDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Дата неизвестна'
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

export function TrainerClientItem({ relation, leaveDisabled, onLeave }: TrainerClientItemProps) {
  const subtitle = formatClientCardSubtitle(relation)

  return (
    <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 text-sm transition hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <UserCheck size={16} className="shrink-0 text-primary" />
            <span className="truncate text-base font-semibold">{formatClientCardTitle(relation)}</span>
          </div>
          {subtitle ? <div className="text-xs text-secondary-foreground">{subtitle}</div> : null}
        </div>
        <div className="inline-flex shrink-0 items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">
          Активен
        </div>
      </div>
      <div className="mt-3 text-xs text-secondary-foreground">С нами с {formatJoinedDate(relation.created_at)}</div>
      <div className="mt-4 grid gap-2 sm:flex sm:gap-2">
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link to="/clients/profile" state={{ clientUserId: relation.client_user_id }}>
            Открыть профиль
          </Link>
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="w-full border border-destructive/40 text-destructive hover:bg-destructive/10 sm:w-auto"
          onClick={() => onLeave(relation.relation_id)}
          disabled={leaveDisabled}
        >
          <Link2Off size={14} className="shrink-0" />
          Завершить
        </Button>
      </div>
    </div>
  )
}
