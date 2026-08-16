export type ChatMessage = {
  message_id: string
  conversation_id: string
  sender_user_id: string
  body: string
  status: 'sent' | 'delivered' | 'read' | string
  client_message_id: string
  created_at: string
}

export type ChatConversation = {
  conversation_id: string
  relation_id: string
  trainer_user_id: string
  client_user_id: string
  last_message: ChatMessage | null
  unread_count: number
  can_send: boolean
  last_message_at: string | null
  created_at: string
  updated_at: string
}

export type MessagePage = {
  items: ChatMessage[]
  next_cursor: string | null
}

export type CreateConversationRequest = {
  peer_user_id: string
}

export type SendMessageRequest = {
  body: string
  client_message_id: string
}

export type UnreadCount = {
  unread_count: number
}
