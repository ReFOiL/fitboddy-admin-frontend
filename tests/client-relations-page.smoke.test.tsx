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

describe('ClientRelationsPage smoke', () => {
  beforeEach(() => {
    mocks.activeRelation = null
    mocks.leaveRelation.mockReset()
  })

  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <ClientRelationsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Входящие приглашения')).toBeInTheDocument()
    expect(screen.getByText('Выберите тренера')).toBeInTheDocument()
  })

  it('скрывает предложения, когда уже есть активный тренер', () => {
    mocks.activeRelation = {
      relation_id: 'relation-1',
      trainer_user_id: 'trainer-1',
      trainer_login: 'coach',
    }

    render(
      <MemoryRouter>
        <ClientRelationsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('У вас уже есть активный тренер')).toBeInTheDocument()
    expect(screen.queryByText('Входящие приглашения')).not.toBeInTheDocument()
    expect(screen.queryByText('Выберите тренера')).not.toBeInTheDocument()
  })

  it('завершает связь с тренером после подтверждения', () => {
    mocks.activeRelation = {
      relation_id: 'relation-1',
      trainer_user_id: 'trainer-1',
      trainer_login: 'coach',
    }
    vi.stubGlobal('confirm', vi.fn(() => true))

    render(
      <MemoryRouter>
        <ClientRelationsPage />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Отписаться' }))

    expect(window.confirm).toHaveBeenCalledOnce()
    expect(mocks.leaveRelation).toHaveBeenCalledWith({ relationId: 'relation-1' })
  })
})
