import { Check, CheckCheck, CircleAlert, LoaderCircle } from 'lucide-react'

import { formatChatMessageTime } from '../../lib/messages-formatters'
import { cn } from '../../lib/utils'
import type { ChatMessage } from '../../types/message'

export type MessageDeliveryState = 'pending' | 'failed'

function getStatusLabel(status: string, deliveryState?: MessageDeliveryState) {
  if (deliveryState === 'pending') return 'Отправляется'
  if (deliveryState === 'failed') return 'Не отправлено'
  if (status === 'read') return 'Прочитано'
  if (status === 'delivered') return 'Доставлено'
  return 'Отправлено'
}

function MessageStatus({ status, deliveryState }: { status: string; deliveryState?: MessageDeliveryState }) {
  const label = getStatusLabel(status, deliveryState)
  const Icon =
    deliveryState === 'pending'
      ? LoaderCircle
      : deliveryState === 'failed'
        ? CircleAlert
        : status === 'read' || status === 'delivered'
          ? CheckCheck
          : Check

  return (
    <span className="inline-flex items-center gap-1">
      <Icon
        size={14}
        aria-hidden="true"
        className={cn(deliveryState === 'pending' && 'animate-spin', status === 'read' && 'text-sky-300')}
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export function ChatBubble({
  message,
  mine,
  deliveryState,
}: {
  message: ChatMessage
  mine: boolean
  deliveryState?: MessageDeliveryState
}) {
  return (
    <li className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <article
        className={cn(
          'max-w-[88%] rounded-2xl px-3 py-2 text-[15px] leading-relaxed shadow-sm sm:max-w-[82%] sm:text-sm',
          mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-secondary text-foreground',
          deliveryState === 'failed' && 'ring-1 ring-destructive',
        )}
        aria-label={mine ? 'Ваше сообщение' : 'Входящее сообщение'}
      >
        <div className="whitespace-pre-wrap break-words">{message.body}</div>
        <div
          className={cn(
            'mt-1 flex items-center justify-end gap-1 text-[11px]',
            mine ? 'text-primary-foreground/75' : 'text-secondary-foreground',
          )}
        >
          <time dateTime={message.created_at}>{formatChatMessageTime(message.created_at)}</time>
          {mine ? <MessageStatus status={message.status} deliveryState={deliveryState} /> : null}
        </div>
      </article>
    </li>
  )
}
