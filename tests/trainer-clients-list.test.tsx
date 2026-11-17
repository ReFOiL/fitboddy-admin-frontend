import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

import { TrainerRelationsPage } from '../src/pages/TrainerRelations'
import type { TrainerClientRelation } from '../src/types/relation'

const longName = 'Анна-Мария Александровна Иванова-Смирнова'

const relation: TrainerClientRelation = {
  relation_id: 'rel-1',
  trainer_user_id: 'trainer-1',
  client_user_id: 'client-1',
  client_login: 'anna',
  client_display_name: longName,
  status: 'active',
  source: 'invite',
  created_at: '2026-11-16T00:00:00Z',
  updated_at: '2026-11-16T00:00:00Z',
}

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({ user: { role: 'trainer', user_id: 'trainer-1' } }),
}))

vi.mock('../src/hooks/use-trainer-roster', () => ({
  useTrainerRoster: () => ({
    rows: [
      {
        relation,
        planState: 'missing' as const,
        plan: null,
      },
    ],
    clientsQuery: { isLoading: false, isError: false, refetch: vi.fn() },
  }),
}))

describe('список клиентов', () => {
  it('открывает студию всей строкой, имя в две строки, чипы в одну линию', () => {
    const router = createMemoryRouter(
      [
        { path: '/clients', element: <TrainerRelationsPage /> },
        { path: '/clients/profile', element: <h1>Студия</h1> },
      ],
      { initialEntries: ['/clients?filter=no-plan'] },
    )
    render(<RouterProvider router={router} />)

    expect(screen.queryByRole('link', { name: 'План' })).not.toBeInTheDocument()
    const row = screen.getByRole('button', { name: new RegExp(longName) })
    expect(row.querySelector('.line-clamp-2')).toHaveTextContent(longName)
    const chips = screen.getByRole('button', { name: /^Все/ }).parentElement
    expect(chips?.className).toContain('overflow-x-auto')
    expect(chips?.className).toContain('flex-nowrap')
    expect(screen.getByRole('button', { name: /^Без плана/ })).toHaveClass('shrink-0')

    fireEvent.click(row)
    expect(screen.getByRole('heading', { name: 'Студия' })).toBeInTheDocument()
  })
})
