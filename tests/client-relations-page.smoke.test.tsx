import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { ClientRelationsPage } from '../src/pages/ClientRelations'

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

vi.mock('../src/hooks/use-relations', () => ({
  useClientRelations: () => ({
    trainersQuery: { data: [], isLoading: false, isError: false },
    incomingInvitesQuery: { data: [], isLoading: false, isError: false },
    clientActiveRelationQuery: { data: null, isLoading: false, isError: false },
    createRelationMutation: { isPending: false },
    acceptRelationMutation: { isPending: false },
    leaveRelationMutation: { isPending: false },
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
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <ClientRelationsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Входящие приглашения')).toBeInTheDocument()
    expect(screen.getByText('Выберите тренера')).toBeInTheDocument()
  })
})
