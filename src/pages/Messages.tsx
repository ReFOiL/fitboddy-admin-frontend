import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { ChatThread, type RenderableChatMessage } from '../components/messages/ChatThread'
import { ConversationList } from '../components/messages/ConversationList'
import { EmptyThreadPane } from '../components/messages/StartChatStates'
import { APP_PATHS } from '../config'
import { useAuth } from '../hooks/use-auth'
import { useChatPeerDirectory } from '../hooks/use-chat-peers'
import { useConversationMessages, useConversations, useMessageActions } from '../hooks/use-messages'
import { getConversationPeerId, resolvePeerInfo } from '../lib/messages-formatters'
import { cn } from '../lib/utils'

export function MessagesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { conversationId } = useParams()
  const [searchParams] = useSearchParams()
  const peerUserId = searchParams.get('peerUserId') ?? ''
  const currentUserId = user?.user_id
  const [optimisticState, setOptimisticState] = useState<{
    conversationId: string
    messages: RenderableChatMessage[]
  }>({ conversationId: '', messages: [] })
  const [unreadMarker, setUnreadMarker] = useState({ conversationId: '', count: 0 })
  const [scrollToBottomSignal, setScrollToBottomSignal] = useState(0)
  const openedPeerRef = useRef('')
  const readConversationRef = useRef('')

  const conversationsQuery = useConversations(Boolean(user), 5000)
  const messagesQuery = useConversationMessages(conversationId, 5000)
  const { getOrCreateMutation, sendMutation, markReadMutation } = useMessageActions()
  const { directory: peerDirectory, writablePeers, isLoading: peersLoading } = useChatPeerDirectory(user)
  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data])
  const messages = useMemo(() => messagesQuery.data?.items ?? [], [messagesQuery.data?.items])

  const conversationPeerIds = useMemo(
    () => new Set(conversations.map((item) => getConversationPeerId(item, currentUserId))),
    [conversations, currentUserId],
  )
  const startablePeers = useMemo(
    () => writablePeers.filter((peer) => !conversationPeerIds.has(peer.userId)),
    [conversationPeerIds, writablePeers],
  )
  const relationsPath = user?.role === 'trainer' ? APP_PATHS.clients : APP_PATHS.trainers
  const isTrainer = user?.role === 'trainer'
  const fallbackRole = isTrainer ? 'client' : 'trainer'

  const active = useMemo(
    () => conversations.find((item) => item.conversation_id === conversationId) ?? null,
    [conversationId, conversations],
  )
  const peerId = active ? getConversationPeerId(active, currentUserId) : ''
  const peer = peerId ? resolvePeerInfo(peerId, peerDirectory, fallbackRole) : null
  const unreadMarkerCount = unreadMarker.conversationId === conversationId ? unreadMarker.count : 0

  const openChat = useCallback(
    (peerIdToOpen: string) => {
      getOrCreateMutation.mutate(peerIdToOpen, {
        onSuccess: (conversation) => {
          navigate(APP_PATHS.messageThread.replace(':conversationId', conversation.conversation_id), { replace: true })
        },
      })
    },
    [getOrCreateMutation, navigate],
  )

  useEffect(() => {
    if (!peerUserId || openedPeerRef.current === peerUserId) return
    openedPeerRef.current = peerUserId
    openChat(peerUserId)
  }, [openChat, peerUserId])

  useEffect(() => {
    if (!conversationId || !active || active.unread_count <= 0) return
    if (messagesQuery.isLoading || messagesQuery.isError || readConversationRef.current === conversationId) return
    readConversationRef.current = conversationId
    queueMicrotask(() => setUnreadMarker({ conversationId, count: active.unread_count }))
    markReadMutation.mutate(conversationId, {
      onError: () => {
        readConversationRef.current = ''
      },
    })
  }, [active, conversationId, markReadMutation, messagesQuery.isError, messagesQuery.isLoading])

  const optimisticMessages = useMemo(
    () => (optimisticState.conversationId === conversationId ? optimisticState.messages : []),
    [conversationId, optimisticState],
  )
  const visibleMessages = useMemo(() => [...messages, ...optimisticMessages], [messages, optimisticMessages])

  const sendOptimistically = (body: string) =>
    new Promise<void>((resolve, reject) => {
      if (!conversationId || !currentUserId || active?.can_send === false) {
        reject(new Error('Conversation is read-only'))
        return
      }
      const failedMessage = optimisticMessages.find(
        (message) => message.deliveryState === 'failed' && message.body === body,
      )
      const temporaryId = failedMessage?.message_id ?? `temporary-${crypto.randomUUID()}`
      const temporaryMessage: RenderableChatMessage = {
        message_id: temporaryId,
        conversation_id: conversationId,
        sender_user_id: currentUserId,
        body,
        status: 'sent',
        client_message_id: temporaryId,
        created_at: new Date().toISOString(),
        deliveryState: 'pending',
      }
      setOptimisticState((current) => ({
        conversationId,
        messages:
          current.conversationId === conversationId
            ? failedMessage
              ? current.messages.map((message) => (message.message_id === temporaryId ? temporaryMessage : message))
              : [...current.messages, temporaryMessage]
            : [temporaryMessage],
      }))
      setScrollToBottomSignal((current) => current + 1)
      sendMutation.mutate(
        { conversationId, body },
        {
          onSuccess: () => {
            setOptimisticState((current) => ({
              ...current,
              messages: current.messages.filter((message) => message.message_id !== temporaryId),
            }))
            resolve()
          },
          onError: () => {
            setOptimisticState((current) => ({
              ...current,
              messages: current.messages.map((message) =>
                message.message_id === temporaryId ? { ...message, deliveryState: 'failed' } : message,
              ),
            }))
            reject(new Error('Message send failed'))
          },
        },
      )
    })

  return (
    <div
      className={cn(
        'grid h-full min-h-0 grid-rows-[minmax(0,1fr)] overflow-hidden bg-surface/95 lg:grid-cols-[320px_minmax(0,1fr)]',
        'rounded-none border-0 md:rounded-2xl md:border md:border-border/80 md:bg-surface/85',
      )}
    >
      <section
        aria-label="Список переписок"
        className={cn('h-full min-h-0 flex-col overflow-hidden border-border/70 lg:border-r', conversationId ? 'hidden lg:flex' : 'flex')}
      >
        <ConversationList
          conversations={conversations}
          currentUserId={currentUserId}
          conversationId={conversationId}
          peerDirectory={peerDirectory}
          fallbackRole={fallbackRole}
          startablePeers={startablePeers}
          peersLoading={peersLoading}
          relationsPath={relationsPath}
          isTrainer={isTrainer}
          loading={conversationsQuery.isLoading}
          error={conversationsQuery.isError}
          pending={getOrCreateMutation.isPending}
          onStart={openChat}
          onRetry={() => void conversationsQuery.refetch()}
        />
      </section>

      <section
        aria-label="Текущая переписка"
        className={cn('h-full min-h-0 flex-col overflow-hidden', !conversationId ? 'hidden lg:flex' : 'flex')}
      >
        {conversationId ? (
          <ChatThread
            conversationId={conversationId}
            peerTitle={peer?.title ?? 'Диалог'}
            peerSubtitle={peer?.subtitle ?? 'Диалог'}
            canSend={active?.can_send !== false}
            messages={visibleMessages}
            currentUserId={currentUserId}
            unreadMarkerCount={unreadMarkerCount}
            persistedMessageCount={messages.length}
            loading={messagesQuery.isLoading}
            error={messagesQuery.isError}
            scrollToBottomSignal={scrollToBottomSignal}
            onRetryLoad={() => void messagesQuery.refetch()}
            onSend={sendOptimistically}
          />
        ) : (
          <EmptyThreadPane
            peers={startablePeers}
            peersLoading={peersLoading}
            hasConversations={conversations.length > 0}
            relationsPath={relationsPath}
            isTrainer={isTrainer}
            pending={getOrCreateMutation.isPending}
            onStart={openChat}
          />
        )}
      </section>
    </div>
  )
}
