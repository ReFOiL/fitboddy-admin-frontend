import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Check, CheckCheck, ChevronLeft, MessageSquare, Send, SquarePen, Users } from 'lucide-react'

import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import { AsyncTextState } from '../components/shared'
import { APP_PATHS } from '../config'
import { useAuth } from '../hooks/use-auth'
import { useChatPeerDirectory } from '../hooks/use-chat-peers'
import { useConversationMessages, useConversations, useMessageActions } from '../hooks/use-messages'
import {
  formatChatListTime,
  formatChatMessageTime,
  formatLastMessagePreview,
  getConversationPeerId,
  getPeerInitials,
  resolvePeerInfo,
} from '../lib/messages-formatters'
import { cn } from '../lib/utils'
import type { ChatWritablePeer } from '../lib/messages-formatters'
import type { ChatMessage } from '../types/message'

function MessageTicks({ status, mine }: { status: string; mine: boolean }) {
  if (!mine) return null
  const read = status === 'read'
  const delivered = status === 'delivered' || read
  const Icon = delivered ? CheckCheck : Check
  return (
    <Icon
      size={14}
      className={cn('shrink-0', read ? 'text-sky-300' : mine ? 'text-primary-foreground/70' : 'text-secondary-foreground')}
    />
  )
}

function PeerAvatar({ title }: { title: string }) {
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
      {getPeerInitials(title)}
    </div>
  )
}

export function MessagesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { conversationId } = useParams()
  const [searchParams] = useSearchParams()
  const peerUserId = searchParams.get('peerUserId') ?? ''
  const [draft, setDraft] = useState('')
  const threadEndRef = useRef<HTMLDivElement | null>(null)

  const conversationsQuery = useConversations(Boolean(user), 5000)
  const messagesQuery = useConversationMessages(conversationId, 5000)
  const { getOrCreateMutation, sendMutation, markReadMutation } = useMessageActions()
  const { directory: peerDirectory, writablePeers, isLoading: peersLoading } = useChatPeerDirectory(user)
  const conversations = conversationsQuery.data ?? []
  const conversationPeerIds = useMemo(
    () => new Set(conversations.map((item) => getConversationPeerId(item, user?.user_id))),
    [conversations, user?.user_id],
  )
  const startablePeers = writablePeers.filter((peer) => !conversationPeerIds.has(peer.userId))
  const relationsPath = user?.role === 'trainer' ? APP_PATHS.clients : APP_PATHS.trainers

  const openChat = (peerId: string) => {
    getOrCreateMutation.mutate(peerId, {
      onSuccess: (conversation) => {
        navigate(APP_PATHS.messageThread.replace(':conversationId', conversation.conversation_id), { replace: true })
      },
    })
  }
  const active = useMemo(
    () => conversations.find((item) => item.conversation_id === conversationId) ?? null,
    [conversationId, conversations],
  )
  const messages = messagesQuery.data?.items ?? []
  const peerId = active ? getConversationPeerId(active, user?.user_id) : ''
  const peer = peerId
    ? resolvePeerInfo(peerId, peerDirectory, user?.role === 'trainer' ? 'client' : 'trainer')
    : null

  useEffect(() => {
    if (!peerUserId) return
    getOrCreateMutation.mutate(peerUserId, {
      onSuccess: (conversation) => {
        navigate(APP_PATHS.messageThread.replace(':conversationId', conversation.conversation_id), { replace: true })
      },
    })
    // Open once per peer query param.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerUserId])

  useEffect(() => {
    if (!conversationId || !active || active.unread_count <= 0 || markReadMutation.isPending) return
    if (messagesQuery.isLoading || messagesQuery.isError) return
    markReadMutation.mutate(conversationId)
  }, [active, conversationId, markReadMutation, messagesQuery.isError, messagesQuery.isLoading])

  useEffect(() => {
    const pane = threadEndRef.current?.parentElement
    if (!pane) return
    pane.scrollTop = pane.scrollHeight
  }, [conversationId, messages.length])

  return (
    <div
      className={cn(
        'grid h-full min-h-0 grid-rows-[minmax(0,1fr)] overflow-hidden bg-[rgba(26,31,43,0.95)] lg:grid-cols-[320px_minmax(0,1fr)]',
        'rounded-none border-0 md:rounded-2xl md:border md:border-border/80 md:bg-[rgba(26,31,43,0.85)]',
      )}
    >
      <section className={cn('flex h-full min-h-0 flex-col overflow-hidden border-border/70 lg:border-r', conversationId ? 'hidden lg:flex' : 'flex')}>
        <div className="shrink-0 border-b border-border/60 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-lg font-semibold">
                <MessageSquare size={18} className="text-primary" />
                Сообщения
              </h1>
              <p className="mt-1 text-sm text-secondary-foreground">
                {user?.role === 'trainer' ? 'Переписка с клиентами' : 'Переписка с тренером'}
              </p>
            </div>
            {startablePeers.length === 1 ? (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => openChat(startablePeers[0].userId)}
                disabled={getOrCreateMutation.isPending}
              >
                <SquarePen size={14} />
                Написать
              </Button>
            ) : null}
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {conversationsQuery.isLoading ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : null}
          {conversationsQuery.isError ? (
            <div className="p-4">
              <AsyncTextState tone="destructive">Не удалось загрузить переписки.</AsyncTextState>
            </div>
          ) : null}
          {!conversationsQuery.isLoading && conversations.length === 0 ? (
            <StartChatPanel
              peers={startablePeers}
              peersLoading={peersLoading}
              relationsPath={relationsPath}
              isTrainer={user?.role === 'trainer'}
              pending={getOrCreateMutation.isPending}
              onStart={openChat}
            />
          ) : null}
          {conversations.map((conversation) => {
            const itemPeerId = getConversationPeerId(conversation, user?.user_id)
            const itemPeer = resolvePeerInfo(
              itemPeerId,
              peerDirectory,
              user?.role === 'trainer' ? 'client' : 'trainer',
            )
            const selected = conversation.conversation_id === conversationId
            const unread = conversation.unread_count > 0
            return (
              <Link
                key={conversation.conversation_id}
                to={APP_PATHS.messageThread.replace(':conversationId', conversation.conversation_id)}
                className={cn(
                  'flex min-h-14 items-center gap-3 rounded-xl px-3 py-3.5 transition',
                  selected ? 'bg-primary/15' : unread ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-secondary/70',
                )}
              >
                <PeerAvatar title={itemPeer.title} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className={cn('truncate', unread ? 'font-semibold' : 'font-medium')}>{itemPeer.title}</div>
                    <div className="shrink-0 text-[11px] text-secondary-foreground">
                      {formatChatListTime(conversation.last_message_at ?? conversation.last_message?.created_at ?? null)}
                    </div>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <div className={cn('truncate text-xs', unread ? 'font-medium text-foreground' : 'text-secondary-foreground')}>
                      {formatLastMessagePreview(conversation.last_message, user?.user_id)}
                    </div>
                    {unread ? (
                      <span className="inline-flex min-w-5 justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                        {conversation.unread_count}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            )
          })}
          {conversations.length > 0 && startablePeers.length > 0 ? (
            <StartablePeersList
              peers={startablePeers}
              pending={getOrCreateMutation.isPending}
              onStart={openChat}
            />
          ) : null}
        </div>
      </section>

      <section className={cn('flex h-full min-h-0 flex-col overflow-hidden', !conversationId ? 'hidden lg:flex' : 'flex')}>
        {conversationId ? (
          <>
            <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-2 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
              <Link
                to={APP_PATHS.messages}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-secondary-foreground hover:bg-secondary/70 lg:hidden"
                aria-label="К списку переписок"
              >
                <ChevronLeft size={22} />
              </Link>
              <PeerAvatar title={peer?.title ?? 'Диалог'} />
              <div className="min-w-0">
                <div className="truncate font-semibold">{peer?.title ?? 'Диалог'}</div>
                <div className="truncate text-xs text-secondary-foreground">
                  {active?.can_send === false ? 'Связь завершена, можно читать историю' : peer?.subtitle ?? 'Диалог'}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-5">
              {messagesQuery.isLoading ? <Skeleton className="h-24 w-full rounded-xl" /> : null}
              {messagesQuery.isError ? (
                <AsyncTextState tone="destructive">Не удалось загрузить сообщения.</AsyncTextState>
              ) : null}
              {!messagesQuery.isLoading && messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <AsyncTextState>Напишите первое сообщение.</AsyncTextState>
                </div>
              ) : null}
              {messages.map((message) => (
                <ChatBubble key={message.message_id} message={message} mine={message.sender_user_id === user?.user_id} />
              ))}
              <div ref={threadEndRef} />
            </div>

            <form
              className="shrink-0 border-t border-border/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
              onSubmit={(event) => {
                event.preventDefault()
                if (!conversationId || !draft.trim() || active?.can_send === false) return
                sendMutation.mutate({ conversationId, body: draft.trim() }, { onSuccess: () => setDraft('') })
              }}
            >
              {active?.can_send === false ? (
                <AsyncTextState>Эта переписка закрыта для новых сообщений.</AsyncTextState>
              ) : (
                <div className="flex items-end gap-2">
                  <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Сообщение"
                    disabled={sendMutation.isPending}
                    maxLength={4000}
                    enterKeyHint="send"
                    className="min-h-12 text-base"
                  />
                  <Button
                    type="submit"
                    disabled={!draft.trim() || sendMutation.isPending}
                    className="size-12 shrink-0 px-0 sm:h-12 sm:w-auto sm:px-4"
                    aria-label="Отправить"
                  >
                    <Send size={18} />
                    <span className="hidden sm:inline">Отправить</span>
                  </Button>
                </div>
              )}
            </form>
          </>
        ) : (
          <EmptyThreadPane
            peers={startablePeers}
            peersLoading={peersLoading}
            hasConversations={conversations.length > 0}
            relationsPath={relationsPath}
            isTrainer={user?.role === 'trainer'}
            pending={getOrCreateMutation.isPending}
            onStart={openChat}
          />
        )}
      </section>
    </div>
  )
}

function StartChatPanel({
  peers,
  peersLoading,
  relationsPath,
  isTrainer,
  pending,
  onStart,
}: {
  peers: ChatWritablePeer[]
  peersLoading: boolean
  relationsPath: string
  isTrainer: boolean
  pending: boolean
  onStart: (peerId: string) => void
}) {
  if (peersLoading) {
    return (
      <div className="space-y-2 p-2">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    )
  }

  if (peers.length === 1) {
    const peer = peers[0]
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
        <PeerAvatar title={peer.title} />
        <div>
          <div className="font-medium">{peer.title}</div>
          {peer.subtitle ? <div className="mt-0.5 text-xs text-secondary-foreground">{peer.subtitle}</div> : null}
        </div>
        <p className="max-w-xs text-sm text-secondary-foreground">
          {isTrainer ? 'Напишите клиенту — переписка откроется сразу.' : 'Напишите тренеру — переписка откроется сразу.'}
        </p>
        <Button className="h-12 w-full max-w-xs gap-2" onClick={() => onStart(peer.userId)} disabled={pending}>
          <SquarePen size={14} />
          {isTrainer ? 'Написать клиенту' : 'Написать тренеру'}
        </Button>
      </div>
    )
  }

  if (peers.length > 1) {
    return (
      <div className="space-y-2 p-1">
        <div className="px-3 pt-2 text-xs font-medium uppercase tracking-wide text-secondary-foreground">
          Кому написать
        </div>
        <StartablePeersList peers={peers} pending={pending} onStart={onStart} heading={false} />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
      <Users size={22} className="text-primary" />
      <div className="font-medium">Пока некому написать</div>
      <p className="max-w-xs text-sm text-secondary-foreground">
        {isTrainer
          ? 'Сначала подключите клиента — после этого чат появится здесь.'
          : 'Сначала выберите тренера — после этого чат появится здесь.'}
      </p>
      <Button asChild className="h-12 w-full max-w-xs">
        <Link to={relationsPath}>{isTrainer ? 'К клиентам' : 'К тренерам'}</Link>
      </Button>
    </div>
  )
}

function StartablePeersList({
  peers,
  pending,
  onStart,
  heading = true,
}: {
  peers: ChatWritablePeer[]
  pending: boolean
  onStart: (peerId: string) => void
  heading?: boolean
}) {
  return (
    <div className="space-y-1">
      {heading ? (
        <div className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-secondary-foreground">
          Можно написать
        </div>
      ) : null}
      {peers.map((peer) => (
        <button
          key={peer.userId}
          type="button"
          disabled={pending}
          onClick={() => onStart(peer.userId)}
          className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left transition hover:bg-secondary/70 disabled:opacity-60"
        >
          <PeerAvatar title={peer.title} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{peer.title}</div>
            <div className="truncate text-xs text-secondary-foreground">{peer.subtitle ?? 'Начать переписку'}</div>
          </div>
          <SquarePen size={14} className="shrink-0 text-primary" />
        </button>
      ))}
    </div>
  )
}

function EmptyThreadPane({
  peers,
  peersLoading,
  hasConversations,
  relationsPath,
  isTrainer,
  pending,
  onStart,
}: {
  peers: ChatWritablePeer[]
  peersLoading: boolean
  hasConversations: boolean
  relationsPath: string
  isTrainer: boolean
  pending: boolean
  onStart: (peerId: string) => void
}) {
  const singlePeer = !hasConversations && peers.length === 1 ? peers[0] : null

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <MessageSquare size={28} className="text-primary" />
      <div className="text-base font-medium">
        {singlePeer ? `Написать ${singlePeer.title}` : 'Выберите переписку'}
      </div>
      <div className="max-w-sm text-sm text-secondary-foreground">
        {hasConversations
          ? peers.length > 0
            ? 'Выберите диалог слева или начните новый из списка «Можно написать».'
            : 'Выберите диалог слева.'
          : peersLoading
            ? 'Загружаем, кому можно написать…'
            : singlePeer
              ? isTrainer
                ? 'Откройте чат с клиентом в один клик.'
                : 'Откройте чат с тренером в один клик.'
              : peers.length > 1
                ? 'Выберите, кому написать, в списке слева.'
                : isTrainer
                  ? 'Подключите клиента — и чат появится здесь.'
                  : 'Выберите тренера — и чат появится здесь.'}
      </div>
      {singlePeer ? (
        <Button className="gap-2" onClick={() => onStart(singlePeer.userId)} disabled={pending}>
          <SquarePen size={14} />
          {isTrainer ? 'Написать клиенту' : 'Написать тренеру'}
        </Button>
      ) : !hasConversations && peers.length === 0 && !peersLoading ? (
        <Button asChild>
          <Link to={relationsPath}>{isTrainer ? 'К клиентам' : 'К тренерам'}</Link>
        </Button>
      ) : null}
    </div>
  )
}

function ChatBubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[88%] rounded-2xl px-3 py-2 text-[15px] leading-relaxed shadow-sm sm:max-w-[82%] sm:text-sm',
          mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-secondary text-foreground',
        )}
      >
        <div className="whitespace-pre-wrap break-words">{message.body}</div>
        <div
          className={cn(
            'mt-1 flex items-center justify-end gap-1 text-[11px]',
            mine ? 'text-primary-foreground/75' : 'text-secondary-foreground',
          )}
        >
          <span>{formatChatMessageTime(message.created_at)}</span>
          <MessageTicks status={message.status} mine={mine} />
        </div>
      </div>
    </div>
  )
}
