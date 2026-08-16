import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { MessagesPage } from '../src/pages/Messages'

const mocks = vi.hoisted(() => ({
  getOrCreate: vi.fn(),
  markRead: vi.fn(),
  navigate: vi.fn(),
  conversationId: undefined as string | undefined,
  messagesLoading: false,
  messagesError: false,
}))

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { role: 'client', user_id: 'client-1', email: 'client@example.com' },
  }),
}))

vi.mock('../src/hooks/use-chat-peers', () => ({
  useChatPeerDirectory: () => ({
    directory: new Map([['trainer-1', { title: 'Тренер Тестов' }]]),
    writablePeers: [],
    isLoading: false,
  }),
}))

vi.mock('../src/hooks/use-messages', () => ({
  useConversations: () => ({
    data: [
      {
        conversation_id: 'conversation-1',
        relation_id: 'relation-1',
        trainer_user_id: 'trainer-1',
        client_user_id: 'client-1',
        last_message: null,
        unread_count: 2,
        can_send: true,
        last_message_at: null,
        created_at: '2026-08-16T10:00:00.000Z',
        updated_at: '2026-08-16T10:00:00.000Z',
      },
    ],
    isLoading: false,
    isError: false,
  }),
  useConversationMessages: () => ({
    data: { items: [], next_cursor: null },
    isLoading: mocks.messagesLoading,
    isError: mocks.messagesError,
  }),
  useMessageActions: () => ({
    getOrCreateMutation: { mutate: mocks.getOrCreate, isPending: false },
    sendMutation: { mutate: vi.fn(), isPending: false },
    markReadMutation: { mutate: mocks.markRead, isPending: false },
  }),
}))

function renderMessages(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:conversationId" element={<MessagesPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MessagesPage existing behavior', () => {
  beforeEach(() => {
    mocks.getOrCreate.mockReset()
    mocks.markRead.mockReset()
    mocks.messagesLoading = false
    mocks.messagesError = false
  })

  it('opens a peer deep-link only once and replaces it with the conversation route', async () => {
    mocks.getOrCreate.mockImplementation((_peerId: string, options: { onSuccess: (value: object) => void }) => {
      options.onSuccess({ conversation_id: 'conversation-1' })
    })

    renderMessages('/messages?peerUserId=trainer-1')

    await waitFor(() => expect(mocks.getOrCreate).toHaveBeenCalledTimes(1))
    expect(mocks.getOrCreate).toHaveBeenCalledWith('trainer-1', expect.any(Object))
    expect((await screen.findAllByText('Тренер Тестов')).length).toBeGreaterThan(0)
  })

  it('marks unread only after messages finish loading successfully', () => {
    mocks.messagesLoading = true
    const view = renderMessages('/messages/conversation-1')
    expect(mocks.markRead).not.toHaveBeenCalled()

    mocks.messagesLoading = false
    mocks.messagesError = true
    view.rerender(
      <MemoryRouter initialEntries={['/messages/conversation-1']}>
        <Routes>
          <Route path="/messages/:conversationId" element={<MessagesPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(mocks.markRead).not.toHaveBeenCalled()

    mocks.messagesError = false
    view.rerender(
      <MemoryRouter initialEntries={['/messages/conversation-1']}>
        <Routes>
          <Route path="/messages/:conversationId" element={<MessagesPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(mocks.markRead).toHaveBeenCalledWith('conversation-1', expect.any(Object))
  })

  it('keeps mobile list and thread mutually exclusive while desktop can show both', () => {
    const listView = renderMessages('/messages')
    expect(screen.getByRole('region', { name: 'Список переписок' })).toHaveClass('flex')
    expect(screen.getByRole('region', { name: 'Текущая переписка' })).toHaveClass('hidden', 'lg:flex')

    listView.unmount()
    renderMessages('/messages/conversation-1')
    expect(screen.getByRole('region', { name: 'Список переписок' })).toHaveClass('hidden', 'lg:flex')
    expect(screen.getByRole('region', { name: 'Текущая переписка' })).toHaveClass('flex')
    expect(screen.getByRole('link', { name: 'К списку переписок' })).toHaveClass('lg:hidden')
  })
})
