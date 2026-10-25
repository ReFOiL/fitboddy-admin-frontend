import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import axios from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { InviteLandingPage } from '../src/pages/InviteLanding'
import { PENDING_INVITE_CODE_KEY } from '../src/lib/invite'

const mocks = vi.hoisted(() => ({
  getPublicInvite: vi.fn(),
  acceptInviteCode: vi.fn(),
  user: null as { role: string; user_id: string } | null,
  isAuthenticated: false,
  mePending: false,
}))

vi.mock('../src/api/relations', () => ({
  getPublicInvite: mocks.getPublicInvite,
  acceptInviteCode: mocks.acceptInviteCode,
}))

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({
    user: mocks.user,
    isAuthenticated: mocks.isAuthenticated,
    meQuery: { isPending: mocks.mePending },
  }),
}))

const invite = {
  code: 'AB3K9Z',
  trainer_user_id: 'trainer-1',
  trainer_display_name: 'Марина Соколова',
  trainer_login: 'marina',
}

function axiosError(status: number, data: unknown) {
  const error = new axios.AxiosError('request failed')
  error.response = { status, data, statusText: '', headers: {}, config: {} as never }
  return error
}

function renderLanding(path = '/i/ab3k9z') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/i/:code" element={<InviteLandingPage />} />
          <Route path="/home" element={<div>Главная клиента</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('InviteLandingPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mocks.user = null
    mocks.isAuthenticated = false
    mocks.mePending = false
    mocks.getPublicInvite.mockReset()
    mocks.acceptInviteCode.mockReset()
    mocks.getPublicInvite.mockResolvedValue(invite)
    mocks.acceptInviteCode.mockResolvedValue({ relation_id: 'rel-1' })
  })

  it('показывает тренера и ведёт на регистрацию или вход', async () => {
    renderLanding()

    expect(await screen.findByRole('heading', { name: 'Тренер Марина Соколова приглашает вас' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Зарегистрироваться' })).toHaveAttribute('href', '/login?tab=register')
    expect(screen.getByRole('link', { name: 'Войти' })).toHaveAttribute('href', '/login')
    expect(sessionStorage.getItem(PENDING_INVITE_CODE_KEY)).toBe('AB3K9Z')
    expect(mocks.acceptInviteCode).not.toHaveBeenCalled()
  })

  it('после входа клиента принимает приглашение и открывает главную', async () => {
    mocks.user = { role: 'client', user_id: 'client-1' }
    mocks.isAuthenticated = true
    renderLanding()

    expect(await screen.findByText('Главная клиента')).toBeInTheDocument()
    expect(mocks.acceptInviteCode).toHaveBeenCalledWith('AB3K9Z', false)
    expect(sessionStorage.getItem(PENDING_INVITE_CODE_KEY)).toBeNull()
  })

  it('просит подтвердить смену тренера и повторяет accept с force', async () => {
    mocks.user = { role: 'client', user_id: 'client-1' }
    mocks.isAuthenticated = true
    mocks.acceptInviteCode.mockRejectedValueOnce(
      axiosError(409, {
        detail: {
          reason: 'already_linked',
          message: 'client already linked to another trainer',
          current_trainer_user_id: 'trainer-2',
        },
      }),
    )

    renderLanding()

    expect(await screen.findByText('Вы уже занимаетесь с другим тренером. Перейти к Марина Соколова?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Перейти' }))

    await waitFor(() => expect(mocks.acceptInviteCode).toHaveBeenLastCalledWith('AB3K9Z', true))
    expect(await screen.findByText('Главная клиента')).toBeInTheDocument()
  })

  it('объясняет тренеру, что ссылка для клиентов', async () => {
    mocks.user = { role: 'trainer', user_id: 'trainer-9' }
    mocks.isAuthenticated = true
    mocks.acceptInviteCode.mockRejectedValueOnce(axiosError(403, { detail: 'forbidden' }))

    renderLanding()

    expect(await screen.findByRole('heading', { name: 'Эта ссылка для клиентов' })).toBeInTheDocument()
    expect(sessionStorage.getItem(PENDING_INVITE_CODE_KEY)).toBeNull()
  })

  it('показывает, что код неизвестен', async () => {
    mocks.getPublicInvite.mockRejectedValueOnce(axiosError(404, { detail: 'not found' }))
    renderLanding('/i/ZZZZZZ')

    expect(await screen.findByRole('heading', { name: 'Приглашение не найдено' })).toBeInTheDocument()
    expect(mocks.acceptInviteCode).not.toHaveBeenCalled()
  })
})
