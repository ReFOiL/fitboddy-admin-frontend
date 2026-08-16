import {
  formatChatDateLabel,
  formatChatListTime,
  formatLastMessagePreview,
  getPeerInitials,
  isSameChatDate,
} from '../src/lib/messages-formatters'
import type { ChatMessage } from '../src/types/message'

describe('messages-formatters', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-16T12:00:00.000Z'))
  })

  afterEach(() => vi.useRealTimers())

  it('formats relative list times and date separators', () => {
    expect(formatChatListTime('2026-08-16T10:15:00.000Z')).toMatch(/\d{2}:\d{2}/)
    expect(formatChatListTime('2026-08-15T10:15:00.000Z')).toBe('вчера')
    expect(formatChatDateLabel('2026-08-16T08:00:00.000Z')).toBe('Сегодня')
    expect(formatChatDateLabel('2026-08-15T08:00:00.000Z')).toBe('Вчера')
  })

  it('groups messages by local calendar date', () => {
    expect(isSameChatDate('2026-08-16T08:00:00.000Z', '2026-08-16T20:00:00.000Z')).toBe(true)
    expect(isSameChatDate('2026-08-16T08:00:00.000Z', '2026-08-15T20:00:00.000Z')).toBe(false)
    expect(isSameChatDate('invalid', '2026-08-16T20:00:00.000Z')).toBe(false)
  })

  it('formats previews and peer initials', () => {
    const message: ChatMessage = {
      message_id: 'message-1',
      conversation_id: 'conversation-1',
      sender_user_id: 'user-1',
      body: '  Привет  ',
      status: 'sent',
      client_message_id: 'client-1',
      created_at: '2026-08-16T10:00:00.000Z',
    }
    expect(formatLastMessagePreview(message, 'user-1')).toBe('Вы: Привет')
    expect(getPeerInitials('Анна Иванова')).toBe('АИ')
    expect(getPeerInitials(' ')).toBe('?')
  })
})
