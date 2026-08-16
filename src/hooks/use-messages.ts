import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  getOrCreateConversation,
  getUnreadCount,
  listConversations,
  listMessages,
  markConversationRead,
  queryKeys,
  resolveMessagesWsUrl,
  sendMessage,
} from '../api'
import { getStoredAccessToken } from '../stores/auth.store'
import type { ChatMessage } from '../types/message'

export function useUnreadCount(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.messages.unreadCount,
    queryFn: getUnreadCount,
    enabled,
    refetchInterval: 15_000,
  })
}

export function useConversations(enabled: boolean, refetchInterval?: number | false) {
  return useQuery({
    queryKey: queryKeys.messages.conversations,
    queryFn: listConversations,
    enabled,
    refetchInterval: refetchInterval || false,
  })
}

export function useConversationMessages(conversationId: string | undefined, refetchInterval?: number | false) {
  return useQuery({
    queryKey: queryKeys.messages.conversationMessages(conversationId ?? ''),
    queryFn: () => listMessages(conversationId ?? ''),
    enabled: Boolean(conversationId),
    refetchInterval: refetchInterval || false,
  })
}

export function useMessageActions() {
  const queryClient = useQueryClient()

  const invalidateMessaging = async () => {
    await queryClient.invalidateQueries({ queryKey: ['messages'] })
  }

  const getOrCreateMutation = useMutation({
    mutationFn: (peerUserId: string) => getOrCreateConversation({ peer_user_id: peerUserId }),
    onSuccess: async () => {
      await invalidateMessaging()
    },
    onError: () => {
      toast.error('Не удалось открыть диалог')
    },
  })

  const sendMutation = useMutation({
    mutationFn: (payload: { conversationId: string; body: string }) =>
      sendMessage(payload.conversationId, { body: payload.body, client_message_id: crypto.randomUUID() }),
    onSuccess: async () => {
      await invalidateMessaging()
    },
    onError: () => {
      toast.error('Не удалось отправить сообщение')
    },
  })

  const markReadMutation = useMutation({
    mutationFn: (conversationId: string) => markConversationRead(conversationId),
    onSuccess: async () => {
      await invalidateMessaging()
    },
  })

  return { getOrCreateMutation, sendMutation, markReadMutation }
}

export function useMessagingSocket(enabled: boolean) {
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!enabled) return
    const token = getStoredAccessToken()
    if (!token) return

    let closed = false
    const socket = new WebSocket(resolveMessagesWsUrl(token))
    socketRef.current = socket

    socket.onopen = () => {
      if (!closed) setConnected(true)
    }
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string; message?: ChatMessage }
        if (payload.type === 'ping') return
        void queryClient.invalidateQueries({ queryKey: ['messages'] })
      } catch {
        return
      }
    }
    socket.onerror = () => {
      setConnected(false)
    }
    socket.onclose = () => {
      if (!closed) setConnected(false)
    }

    return () => {
      closed = true
      socket.close()
      socketRef.current = null
      setConnected(false)
    }
  }, [enabled, queryClient])

  return connected
}
