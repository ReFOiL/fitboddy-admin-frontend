import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import { APP_PATHS } from '../../config'
import { isSameChatDate } from '../../lib/messages-formatters'
import { isNearChatBottom } from '../../lib/messages-scroll'
import type { ChatMessage } from '../../types/message'
import { AsyncTextState, EmptyState, QueryState } from '../shared'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'
import { PeerAvatar } from './AvatarStatus'
import { ChatBubble, type MessageDeliveryState } from './ChatBubble'
import { DateSeparator, NewMessagesSeparator } from './DateSeparator'
import { MessageComposer } from './MessageComposer'

export type RenderableChatMessage = ChatMessage & { deliveryState?: MessageDeliveryState }

export function ChatThread({
  conversationId,
  peerTitle,
  peerSubtitle,
  canSend,
  messages,
  currentUserId,
  unreadMarkerCount,
  persistedMessageCount,
  loading,
  error,
  scrollToBottomSignal,
  onRetryLoad,
  onSend,
}: {
  conversationId: string
  peerTitle: string
  peerSubtitle: string
  canSend: boolean
  messages: RenderableChatMessage[]
  currentUserId?: string
  unreadMarkerCount: number
  persistedMessageCount: number
  loading: boolean
  error: boolean
  scrollToBottomSignal: number
  onRetryLoad: () => void
  onSend: (body: string) => Promise<void>
}) {
  const paneRef = useRef<HTMLDivElement | null>(null)
  const nearBottomRef = useRef(true)
  const previousCountRef = useRef(messages.length)
  const previousLoadingRef = useRef(loading)
  const previousConversationRef = useRef(conversationId)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  const scrollToBottom = useCallback(() => {
    const pane = paneRef.current
    if (!pane) return
    pane.scrollTop = pane.scrollHeight
    nearBottomRef.current = true
    setShowScrollButton(false)
  }, [])

  useEffect(() => {
    if (previousConversationRef.current !== conversationId) {
      previousConversationRef.current = conversationId
      previousCountRef.current = messages.length
      previousLoadingRef.current = loading
      setAnnouncement('')
      queueMicrotask(scrollToBottom)
      return
    }
    if (previousLoadingRef.current && !loading) {
      previousLoadingRef.current = false
      previousCountRef.current = messages.length
      queueMicrotask(scrollToBottom)
      return
    }
    previousLoadingRef.current = loading

    const newMessages = messages.slice(previousCountRef.current)
    const incomingCount = newMessages.filter(
      (message) => message.sender_user_id !== currentUserId && !message.deliveryState,
    ).length
    if (incomingCount > 0) {
      setAnnouncement(incomingCount === 1 ? 'Новое сообщение' : `Новых сообщений: ${incomingCount}`)
    }
    previousCountRef.current = messages.length
    if (nearBottomRef.current) queueMicrotask(scrollToBottom)
  }, [conversationId, currentUserId, loading, messages, scrollToBottom])

  useEffect(() => {
    if (scrollToBottomSignal > 0) queueMicrotask(scrollToBottom)
  }, [scrollToBottomSignal, scrollToBottom])

  useEffect(() => {
    if (!loading) queueMicrotask(scrollToBottom)
  }, [conversationId, loading, scrollToBottom])

  const markerIndex =
    unreadMarkerCount > 0 && unreadMarkerCount <= persistedMessageCount
      ? Math.max(0, persistedMessageCount - unreadMarkerCount)
      : -1

  return (
    <>
      <header className="flex shrink-0 items-center gap-2 border-b border-border/60 px-2 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
        <Link
          to={APP_PATHS.messages}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-secondary-foreground hover:bg-secondary/70 lg:hidden"
          aria-label="К списку переписок"
        >
          <ChevronLeft size={22} />
        </Link>
        <PeerAvatar title={peerTitle} />
        <div className="min-w-0">
          <div className="truncate font-semibold">{peerTitle}</div>
          <div className="truncate text-xs text-secondary-foreground" aria-live="polite">
            {canSend ? peerSubtitle : 'Связь завершена, можно читать историю'}
          </div>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={paneRef}
          className="h-full overflow-y-auto px-3 py-4 sm:px-5"
          onScroll={(event) => {
            const nearBottom = isNearChatBottom(event.currentTarget)
            nearBottomRef.current = nearBottom
            setShowScrollButton(!nearBottom)
          }}
        >
          <QueryState
            isLoading={loading}
            isError={error}
            isEmpty={messages.length === 0}
            errorTitle="Не удалось загрузить сообщения"
            onRetry={onRetryLoad}
            loadingFallback={<Skeleton className="h-24 w-full rounded-xl" />}
            emptyFallback={<EmptyState className="h-full border-0 bg-transparent" title="Напишите первое сообщение" />}
          >
            <ul aria-label="Сообщения" className="space-y-2">
              {messages.map((message, index) => {
                const showDate = index === 0 || !isSameChatDate(messages[index - 1].created_at, message.created_at)
                return (
                  <Fragment key={message.message_id}>
                    {showDate ? <DateSeparator value={message.created_at} /> : null}
                    {index === markerIndex ? <NewMessagesSeparator /> : null}
                    <ChatBubble
                      message={message}
                      mine={message.sender_user_id === currentUserId}
                      deliveryState={message.deliveryState}
                    />
                  </Fragment>
                )
              })}
            </ul>
          </QueryState>
        </div>
        {showScrollButton ? (
          <Button
            type="button"
            size="sm"
            className="absolute bottom-3 right-3 gap-1.5 rounded-full shadow-lg"
            onClick={scrollToBottom}
            aria-label="Прокрутить к новым сообщениям"
          >
            <ChevronDown size={16} />Вниз
          </Button>
        ) : null}
      </div>
      <div className="sr-only" aria-live="polite">{announcement}</div>
      {canSend ? (
        <MessageComposer onSend={onSend} />
      ) : (
        <div className="shrink-0 border-t border-border/60 p-4">
          <AsyncTextState>Эта переписка закрыта для новых сообщений.</AsyncTextState>
        </div>
      )}
    </>
  )
}
