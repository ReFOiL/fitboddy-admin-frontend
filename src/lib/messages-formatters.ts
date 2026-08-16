import type { ChatConversation, ChatMessage } from '../types/message'

export type ChatPeerInfo = {
  title: string
  subtitle?: string
}

export type ChatWritablePeer = {
  userId: string
  title: string
  subtitle?: string
}

export function formatChatClock(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date)
}

export function formatChatListTime(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayDiff = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000)

  if (dayDiff === 0) return formatChatClock(value)
  if (dayDiff === 1) return 'вчера'
  if (dayDiff > 1 && dayDiff < 7) {
    return new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(date)
  }
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date)
}

export function formatChatMessageTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayDiff = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000)
  const clock = formatChatClock(value)

  if (dayDiff === 0) return clock
  if (dayDiff === 1) return `вчера, ${clock}`
  return `${new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date)}, ${clock}`
}

export function formatChatDateLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayDiff = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000)

  if (dayDiff === 0) return 'Сегодня'
  if (dayDiff === 1) return 'Вчера'
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

export function isSameChatDate(left: string, right: string): boolean {
  const leftDate = new Date(left)
  const rightDate = new Date(right)
  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) return false
  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  )
}

export function formatLastMessagePreview(message: ChatMessage | null, currentUserId: string | undefined): string {
  if (!message?.body.trim()) return 'Нет сообщений'
  const prefix = message.sender_user_id === currentUserId ? 'Вы: ' : ''
  return `${prefix}${message.body.trim()}`
}

export function getConversationPeerId(conversation: ChatConversation, currentUserId: string | undefined): string {
  const userId = currentUserId?.trim().toLowerCase()
  const trainerId = conversation.trainer_user_id
  const clientId = conversation.client_user_id
  if (userId && userId === trainerId?.trim().toLowerCase()) return clientId
  if (userId && userId === clientId?.trim().toLowerCase()) return trainerId
  return trainerId || clientId
}

export function getPeerInitials(title: string): string {
  const parts = title
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  if (parts.length === 0) return '?'
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
}

export function resolvePeerInfo(
  peerId: string,
  directory: Map<string, ChatPeerInfo>,
  fallbackRole: 'trainer' | 'client',
): ChatPeerInfo {
  return directory.get(peerId) ?? { title: fallbackRole === 'trainer' ? 'Тренер' : 'Клиент' }
}
