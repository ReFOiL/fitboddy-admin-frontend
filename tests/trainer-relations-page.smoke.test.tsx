import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { TrainerRelationsPage } from '../src/pages/TrainerRelations'

vi.mock('../src/hooks/use-user-id-guard', () => ({
  useUserIdGuard: () => ({
    user: { role: 'trainer', user_id: 'trainer-1' },
    userId: 'trainer-1',
    withUserId: (action: (id: string) => void) => action('trainer-1'),
  }),
}))

vi.mock('../src/hooks/use-relations', () => ({
  useTrainerRelations: () => ({
    trainerClientsPaginatedQuery: {
      data: { items: [], total: 0, total_pages: 1, page_size: 6 },
      isLoading: false,
      isError: false,
    },
    trainerPublicationStatusQuery: {
      data: { trainer_user_id: 'trainer-1', is_published: true },
      isLoading: false,
      isError: false,
    },
    upsertDiscoveryProfileMutation: { isPending: false },
    leaveRelationMutation: { isPending: false },
  }),
}))

vi.mock('../src/hooks/use-relation-actions', () => ({
  useTrainerRelationActions: () => ({
    togglePublication: vi.fn(),
    leaveClientRelation: vi.fn(),
  }),
}))

describe('TrainerRelationsPage smoke', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <TrainerRelationsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Видимость профиля')).toBeInTheDocument()
    expect(screen.getByText('Клиенты')).toBeInTheDocument()
  })
})
