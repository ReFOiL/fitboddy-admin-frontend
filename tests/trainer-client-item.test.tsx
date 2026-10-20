import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { TrainerClientItem } from '../src/components/trainer-relations/TrainerClientItem'
import type { TrainerClientRelation } from '../src/types/relation'

const relation: TrainerClientRelation = {
  relation_id: 'rel-1',
  trainer_user_id: 'trainer-1',
  client_user_id: 'client-1',
  client_display_name: 'Анна',
  client_login: 'anna',
  status: 'active',
  source: 'direct',
  created_at: '2026-01-15T00:00:00.000Z',
  updated_at: '2026-01-15T00:00:00.000Z',
}

describe('TrainerClientItem', () => {
  it('даёт прямой переход к составлению плана', () => {
    render(
      <MemoryRouter>
        <TrainerClientItem relation={relation} leaveDisabled={false} onLeave={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'План' })).toHaveAttribute(
      'href',
      '/clients/client-1/plan',
    )
  })
})
