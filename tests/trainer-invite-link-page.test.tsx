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
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
  })

  it('показывает код и копирует абсолютную ссылку с поля и с иконки', async () => {
    renderPage()

    const inviteUrl = `${window.location.origin}/i/AB3K9Z`
    expect(await screen.findByText('AB3K9Z')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Скопировать ссылку' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: inviteUrl }))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(inviteUrl)
    })
    expect(screen.getByRole('button', { name: 'Скопировано' })).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: 'QR-код приглашения' })).toBeInTheDocument()
    expect(screen.getByText(/Постоянная ссылка и код/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Поделиться' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Скопировано' }))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(2)
    })
  })

  it('делится ссылкой через navigator.share', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Поделиться' }))
    await waitFor(() =>
      expect(share).toHaveBeenCalledWith({
        title: 'Приглашение в Fitboddy',
        text: 'Ссылка, чтобы заниматься вместе',
        url: `${window.location.origin}/i/AB3K9Z`,
      }),
    )
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled()
  })

  it('без системного шаринга копирует ссылку', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Поделиться' }))
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/i/AB3K9Z`),
    )
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
