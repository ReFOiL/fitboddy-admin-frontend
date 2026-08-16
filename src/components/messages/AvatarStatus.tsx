import { getPeerInitials } from '../../lib/messages-formatters'
import { cn } from '../../lib/utils'

export function PeerAvatar({
  title,
  status,
  size = 'default',
}: {
  title: string
  status?: string
  size?: 'default' | 'small'
}) {
  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary',
        size === 'small' ? 'size-9' : 'size-10',
      )}
      aria-label={`${title}${status ? `, ${status}` : ''}`}
    >
      <span aria-hidden="true">{getPeerInitials(title)}</span>
      {status ? (
        <span
          aria-hidden="true"
          className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-surface bg-emerald-400"
        />
      ) : null}
    </div>
  )
}
