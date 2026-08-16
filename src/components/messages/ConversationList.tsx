import { Link } from 'react-router-dom'
import { MessageSquare, SquarePen } from 'lucide-react'

import { APP_PATHS } from '../../config'
import {
  formatChatListTime,
  formatLastMessagePreview,
  getConversationPeerId,
  resolvePeerInfo,
} from '../../lib/messages-formatters'
import { cn } from '../../lib/utils'
import type { ChatPeerInfo, ChatWritablePeer } from '../../lib/messages-formatters'
import type { ChatConversation } from '../../types/message'
import { QueryState } from '../shared'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'
import { PeerAvatar } from './AvatarStatus'
import { StartablePeersList, StartChatPanel } from './StartChatStates'

export function ConversationRow({
  conversation,
  currentUserId,
  peerDirectory,
  fallbackRole,
  selected,
}: {
  conversation: ChatConversation
  currentUserId?: string
  peerDirectory: Map<string, ChatPeerInfo>
  fallbackRole: 'trainer' | 'client'
  selected: boolean
}) {
  const peerId = getConversationPeerId(conversation, currentUserId)
  const peer = resolvePeerInfo(peerId, peerDirectory, fallbackRole)
  const unread = conversation.unread_count > 0

  return (
    <li>
      <Link
        to={APP_PATHS.messageThread.replace(':conversationId', conversation.conversation_id)}
        aria-selected={selected}
        className={cn(
          'flex min-h-14 items-center gap-3 rounded-xl px-3 py-3.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
          selected ? 'bg-primary/15' : unread ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-secondary/70',
        )}
      >
        <PeerAvatar title={peer.title} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className={cn('truncate', unread ? 'font-semibold' : 'font-medium')}>{peer.title}</div>
            <time className="shrink-0 text-[11px] text-secondary-foreground">
              {formatChatListTime(conversation.last_message_at ?? conversation.last_message?.created_at ?? null)}
            </time>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <div className={cn('truncate text-xs', unread ? 'font-medium text-foreground' : 'text-secondary-foreground')}>
              {formatLastMessagePreview(conversation.last_message, currentUserId)}
            </div>
            {unread ? (
              <span
                aria-label={`${conversation.unread_count} непрочитанных`}
                className="inline-flex min-w-5 justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground"
              >
                {conversation.unread_count}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </li>
  )
}

export function ConversationList({
  conversations,
  currentUserId,
  conversationId,
  peerDirectory,
  fallbackRole,
  startablePeers,
  peersLoading,
  relationsPath,
  isTrainer,
  loading,
  error,
  pending,
  onStart,
  onRetry,
}: {
  conversations: ChatConversation[]
  currentUserId?: string
  conversationId?: string
  peerDirectory: Map<string, ChatPeerInfo>
  fallbackRole: 'trainer' | 'client'
  startablePeers: ChatWritablePeer[]
  peersLoading: boolean
  relationsPath: string
  isTrainer: boolean
  loading: boolean
  error: boolean
  pending: boolean
  onStart: (peerId: string) => void
  onRetry: () => void
}) {
  return (
    <>
      <div className="shrink-0 border-b border-border/60 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold"><MessageSquare size={18} className="text-primary" />Сообщения</h1>
            <p className="mt-1 text-sm text-secondary-foreground">{isTrainer ? 'Переписка с клиентами' : 'Переписка с тренером'}</p>
          </div>
          {startablePeers.length === 1 ? (
            <Button size="sm" className="gap-1.5" onClick={() => onStart(startablePeers[0].userId)} disabled={pending}><SquarePen size={14} />Написать</Button>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        <QueryState
          isLoading={loading}
          isError={error}
          isEmpty={conversations.length === 0}
          errorTitle="Не удалось загрузить переписки"
          onRetry={onRetry}
          loadingFallback={<div className="space-y-2 p-2"><Skeleton className="h-16 w-full rounded-xl" /><Skeleton className="h-16 w-full rounded-xl" /></div>}
          emptyFallback={<StartChatPanel peers={startablePeers} peersLoading={peersLoading} relationsPath={relationsPath} isTrainer={isTrainer} pending={pending} onStart={onStart} />}
        >
          <>
            <ul aria-label="Переписки" className="space-y-1">
              {conversations.map((conversation) => (
                <ConversationRow
                  key={conversation.conversation_id}
                  conversation={conversation}
                  currentUserId={currentUserId}
                  peerDirectory={peerDirectory}
                  fallbackRole={fallbackRole}
                  selected={conversation.conversation_id === conversationId}
                />
              ))}
            </ul>
            {startablePeers.length > 0 ? <StartablePeersList peers={startablePeers} pending={pending} onStart={onStart} /> : null}
          </>
        </QueryState>
      </div>
    </>
  )
}
