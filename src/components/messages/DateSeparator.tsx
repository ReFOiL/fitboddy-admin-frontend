import { formatChatDateLabel } from '../../lib/messages-formatters'

export function DateSeparator({ value }: { value: string }) {
  return (
    <li className="flex items-center gap-3 py-2" role="separator" aria-label={formatChatDateLabel(value)}>
      <span className="h-px flex-1 bg-border/60" />
      <time
        dateTime={value}
        className="rounded-full bg-secondary/80 px-3 py-1 text-[11px] font-medium text-secondary-foreground"
      >
        {formatChatDateLabel(value)}
      </time>
      <span className="h-px flex-1 bg-border/60" />
    </li>
  )
}

export function NewMessagesSeparator() {
  return (
    <li className="flex items-center gap-3 py-2" role="separator" aria-label="Новые сообщения">
      <span className="h-px flex-1 bg-primary/60" />
      <span className="text-[11px] font-medium text-primary">Новые сообщения</span>
      <span className="h-px flex-1 bg-primary/60" />
    </li>
  )
}
