import {
  formatChatDateLabel,
  formatChatListTime,
  formatLastMessagePreview,
  getPeerInitials,
  isSameChatDate,
} from '../src/lib/messages-formatters'
import type { ChatMessage } from '../src/types/message'

/**
 * Локальные дата и время. Прежние UTC-строки в UTC+10 попадали на соседний календарный день,
 * и «сегодня» / «один день» переставали совпадать с ожиданиями.
 */
function localTimestamp(year: number, month: number, day: number, hour = 0, minute = 0): string {
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString()
}

describe('messages-formatters', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 16, 12, 0, 0, 0))
  })

  afterEach(() => vi.useRealTimers())

  it('formats relative list times and date separators', () => {
    expect(formatChatListTime(localTimestamp(2026, 8, 16, 10, 15))).toMatch(/\d{2}:\d{2}/)
    expect(formatChatListTime(localTimestamp(2026, 8, 15, 10, 15))).toBe('вчера')
    expect(formatChatDateLabel(localTimestamp(2026, 8, 16, 8, 0))).toBe('Сегодня')
    expect(formatChatDateLabel(localTimestamp(2026, 8, 15, 8, 0))).toBe('Вчера')
  })

  it('groups messages by local calendar date', () => {
    expect(isSameChatDate(localTimestamp(2026, 8, 16, 8, 0), localTimestamp(2026, 8, 16, 20, 0))).toBe(true)
    expect(isSameChatDate(localTimestamp(2026, 8, 16, 8, 0), localTimestamp(2026, 8, 15, 20, 0))).toBe(false)
    expect(isSameChatDate('invalid', localTimestamp(2026, 8, 16, 20, 0))).toBe(false)
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
