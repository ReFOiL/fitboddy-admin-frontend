import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MessageSquare, Send } from 'lucide-react'

import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import { AsyncTextState } from '../components/shared'
import { APP_PATHS } from '../config'
import { useAuth } from '../hooks/use-auth'
import { useConversationMessages, useConversations, useMessageActions, useMessagingSocket } from '../hooks/use-messages'
import { formatRussianDate } from '../lib/relations-formatters'
import { cn } from '../lib/utils'

export function MessagesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { conversationId } = useParams()
  const [searchParams] = useSearchParams()
  const peerUserId = searchParams.get('peerUserId') ?? ''
  const [draft, setDraft] = useState('')

  const socketConnected = useMessagingSocket(Boolean(user))
  const pollMs = socketConnected ? false : 4000
  const conversationsQuery = useConversations(Boolean(user), pollMs)
  const messagesQuery = useConversationMessages(conversationId, pollMs)
  const { getOrCreateMutation, sendMutation, markReadMutation } = useMessageActions()
  const conversations = conversationsQuery.data ?? []
  const active = useMemo(
    () => conversations.find((item) => item.conversation_id === conversationId) ?? null,
    [conversationId, conversations],
  )
  const messages = messagesQuery.data?.items ?? []
  const peerId = user?.role === 'trainer' ? active?.client_user_id : active?.trainer_user_id

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
    markReadMutation.mutate(conversationId)
  }, [active, conversationId, markReadMutation])

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className={cn('border-primary/20', conversationId ? 'hidden lg:block' : '')}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare size={18} className="text-primary" />
            Сообщения
          </CardTitle>
          <CardDescription>Переписка с {user?.role === 'trainer' ? 'клиентами' : 'тренером'}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {conversationsQuery.isLoading ? <Skeleton className="h-20 w-full rounded-xl" /> : null}
          {conversationsQuery.isError ? <AsyncTextState tone="destructive">Не удалось загрузить диалоги.</AsyncTextState> : null}
          {!conversationsQuery.isLoading && conversations.length === 0 ? (
            <AsyncTextState>Пока нет диалогов. Откройте чат из карточки связи.</AsyncTextState>
          ) : null}
          {conversations.map((conversation) => {
            const title = user?.role === 'trainer' ? conversation.client_user_id : conversation.trainer_user_id
            return (
              <Link
                key={conversation.conversation_id}
                to={APP_PATHS.messageThread.replace(':conversationId', conversation.conversation_id)}
                className={cn(
                  'block rounded-2xl border border-border/70 bg-secondary/30 p-4 text-sm transition hover:border-primary/40',
                  conversation.conversation_id === conversationId ? 'border-primary/50 bg-primary/10' : '',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{title}</div>
                    <div className="mt-1 truncate text-xs text-secondary-foreground">
                      {conversation.last_message?.body ?? 'Нет сообщений'}
                    </div>
                  </div>
                  {conversation.unread_count > 0 ? (
                    <span className="inline-flex min-w-6 justify-center rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      {conversation.unread_count}
                    </span>
                  ) : null}
                </div>
              </Link>
            )
          })}
        </CardContent>
      </Card>

      <Card className={cn('border-primary/20', !conversationId ? 'hidden lg:block' : '')}>
        <CardHeader>
          <CardTitle>{peerId ? `Диалог с ${peerId}` : 'Выберите диалог'}</CardTitle>
          <CardDescription>
            {active?.can_send === false ? 'Связь завершена — можно только читать историю.' : 'Текстовые сообщения в рамках активной связи.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {conversationId && messagesQuery.isLoading ? <Skeleton className="h-40 w-full rounded-xl" /> : null}
          {conversationId && messagesQuery.isError ? (
            <AsyncTextState tone="destructive">Не удалось загрузить сообщения.</AsyncTextState>
          ) : null}
          {!conversationId ? <AsyncTextState>Выберите диалог слева или откройте чат из списка клиентов.</AsyncTextState> : null}
          {conversationId ? (
            <div className="space-y-3">
              <div className="max-h-[50vh] space-y-2 overflow-y-auto rounded-xl border border-border/60 bg-secondary/20 p-3">
                {messages.length === 0 ? <AsyncTextState>Напишите первое сообщение.</AsyncTextState> : null}
                {messages.map((message) => {
                  const mine = message.sender_user_id === user?.user_id
                  return (
                    <div key={message.message_id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                          mine ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground',
                        )}
                      >
                        <div className="whitespace-pre-wrap break-words">{message.body}</div>
                        <div className={cn('mt-1 text-[10px]', mine ? 'text-primary-foreground/80' : 'text-secondary-foreground')}>
                          {formatRussianDate(message.created_at)} · {message.status}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!conversationId || !draft.trim() || active?.can_send === false) return
                  sendMutation.mutate({ conversationId, body: draft.trim() }, { onSuccess: () => setDraft('') })
                }}
              >
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={active?.can_send === false ? 'Диалог только для чтения' : 'Сообщение'}
                  disabled={active?.can_send === false || sendMutation.isPending}
                  maxLength={4000}
                />
                <Button type="submit" disabled={!draft.trim() || active?.can_send === false || sendMutation.isPending}>
                  <Send size={16} />
                  Отправить
                </Button>
              </form>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
