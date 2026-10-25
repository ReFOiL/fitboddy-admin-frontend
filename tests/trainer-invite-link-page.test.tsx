import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { TrainerInviteLinkPage } from '../src/pages/TrainerInviteLink'

const mocks = vi.hoisted(() => ({
  getMyInviteLink: vi.fn(),
  rotateMyInviteLink: vi.fn(),
}))

vi.mock('../src/api/relations', () => ({
  getMyInviteLink: mocks.getMyInviteLink,
  rotateMyInviteLink: mocks.rotateMyInviteLink,
}))

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({ user: { role: 'trainer', user_id: 'trainer-1' } }),
}))

vi.mock('../src/hooks/use-relations', () => ({
  useTrainerRelations: () => ({
    trainerPublicationStatusQuery: { data: { is_published: true } },
    upsertDiscoveryProfileMutation: { isPending: false, mutate: vi.fn() },
    createRelationMutation: { isPending: false, mutate: vi.fn() },
  }),
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TrainerInviteLinkPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TrainerInviteLinkPage', () => {
  beforeEach(() => {
    mocks.getMyInviteLink.mockResolvedValue({ code: 'AB3K9Z', invite_path: '/i/AB3K9Z' })
    mocks.rotateMyInviteLink.mockResolvedValue({ code: 'ZX8K2M', invite_path: '/i/ZX8K2M' })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it('показывает код и копирует абсолютную ссылку', async () => {
    renderPage()

    expect(await screen.findByText('AB3K9Z')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Скопировать ссылку' }))

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/i/AB3K9Z`)
    })
  })

  it('обновляет код после подтверждения', async () => {
    renderPage()
    expect(await screen.findByText('AB3K9Z')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ещё действия' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Обновить код/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Обновить' }))

    expect(await screen.findByText('ZX8K2M')).toBeInTheDocument()
    expect(mocks.rotateMyInviteLink).toHaveBeenCalledOnce()
  })
})
