import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { ClientRelationsPage } from '../src/pages/ClientRelations'

const mocks = vi.hoisted(() => ({
  activeRelation: null as null | {
    relation_id: string
    trainer_user_id: string
    trainer_login: string
  },
  leaveRelation: vi.fn(),
}))

vi.mock('../src/hooks/use-user-id-guard', () => ({
  useUserIdGuard: () => ({
    user: { role: 'client', user_id: 'client-1' },
    userId: 'client-1',
    withUserId: (action: (id: string) => void) => action('client-1'),
  }),
}))

vi.mock('../src/hooks/use-profile', () => ({
  useProfile: () => ({
    profileQuery: {
      data: {
        goal: 'maintenance',
        experience_level: 'beginner',
        workout_location: 'home',
      },
    },
  }),
  useTrainerProfilePreview: () => ({ data: undefined, isLoading: false, isError: false }),
}))

vi.mock('../src/hooks/use-messages', () => ({
  useConversations: () => ({ data: [] }),
  useUnreadCount: () => ({ data: { unread_count: 0 } }),
}))

vi.mock('../src/hooks/use-relations', () => ({
  useClientRelations: () => ({
    trainersQuery: { data: [], isLoading: false, isError: false },
    incomingInvitesQuery: { data: [], isLoading: false, isError: false },
    clientActiveRelationQuery: { data: mocks.activeRelation, isLoading: false, isError: false },
    createRelationMutation: { isPending: false },
    acceptRelationMutation: { isPending: false },
    leaveRelationMutation: { isPending: false, mutate: mocks.leaveRelation },
  }),
}))

vi.mock('../src/hooks/use-relation-actions', () => ({
  useClientRelationActions: () => ({
    acceptInvite: vi.fn(),
    declineInvite: vi.fn(),
    connectTrainer: vi.fn(),
  }),
}))

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ClientRelationsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ClientRelationsPage smoke', () => {
  beforeEach(() => {
    mocks.activeRelation = null
    mocks.leaveRelation.mockReset()
  })

  it('renders without crashing', () => {
    renderPage()

    expect(screen.getByText('Входящие приглашения')).toBeInTheDocument()
    expect(screen.getByText('Каталог тренеров')).toBeInTheDocument()
  })

  it('скрывает предложения, когда уже есть активный тренер', () => {
    mocks.activeRelation = {
      relation_id: 'relation-1',
      trainer_user_id: 'trainer-1',
      trainer_login: 'coach',
    }

    renderPage()

    expect(screen.getByText('Ваш тренер')).toBeInTheDocument()
    expect(screen.getByText('coach')).toBeInTheDocument()
    expect(screen.queryByText('Входящие приглашения')).not.toBeInTheDocument()
    expect(screen.queryByText('Каталог тренеров')).not.toBeInTheDocument()
  })

  it('завершает связь с тренером после подтверждения', () => {
    mocks.activeRelation = {
      relation_id: 'relation-1',
      trainer_user_id: 'trainer-1',
      trainer_login: 'coach',
    }
    vi.stubGlobal('confirm', vi.fn(() => true))

    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Отписаться' }))

    expect(window.confirm).toHaveBeenCalledOnce()
    expect(mocks.leaveRelation).toHaveBeenCalledWith({ relationId: 'relation-1' })
  })
})
