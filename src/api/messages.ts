import { apiClient } from './client'
import type { ChatConversation, ChatMessage, CreateConversationRequest, MessagePage, SendMessageRequest, UnreadCount } from '../types/message'

export async function listConversations(): Promise<ChatConversation[]> {
  const response = await apiClient.get<ChatConversation[]>('/api/v1/messages/conversations')
  return response.data
}

export async function getOrCreateConversation(payload: CreateConversationRequest): Promise<ChatConversation> {
  const response = await apiClient.post<ChatConversation>('/api/v1/messages/conversations', payload)
  return response.data
}

export async function listMessages(conversationId: string, cursor?: string, limit = 50): Promise<MessagePage> {
  const response = await apiClient.get<MessagePage>(`/api/v1/messages/conversations/${conversationId}/messages`, {
    params: { cursor, limit },
  })
  return response.data
}

export async function sendMessage(conversationId: string, payload: SendMessageRequest): Promise<ChatMessage> {
  const response = await apiClient.post<ChatMessage>(`/api/v1/messages/conversations/${conversationId}/messages`, payload)
  return response.data
}

export async function markConversationRead(conversationId: string): Promise<ChatConversation> {
  const response = await apiClient.post<ChatConversation>(`/api/v1/messages/conversations/${conversationId}/read`)
  return response.data
}

export async function getUnreadCount(): Promise<UnreadCount> {
  const response = await apiClient.get<UnreadCount>('/api/v1/messages/unread-count')
  return response.data
}

export function resolveMessagesWsUrl(accessToken: string): string {
  const apiBase = import.meta.env.VITE_PLATFORM_API_URL || ''
  const httpBase = apiBase || window.location.origin
  const wsBase = httpBase.replace(/^http/i, 'ws')
  return `${wsBase}/api/v1/messages/ws?token=${encodeURIComponent(accessToken)}`
}
