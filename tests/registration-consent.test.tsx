import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import App from '../src/App'
import { LoginPage } from '../src/pages/Login'
import { PrivacyPolicyPage, UserAgreementPage } from '../src/pages/LegalDocumentPage'
import { useAuthStore } from '../src/stores/auth.store'

const CONSENT_ERROR = 'Отметьте согласие с политикой и пользовательским соглашением'

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
}))

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({
    loginMutation: { mutate: mocks.login, isPending: false, isError: false },
    registerMutation: { mutate: mocks.register, isPending: false, isError: false },
  }),
}))

function renderLogin(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LoginPage />
    </MemoryRouter>,
  )
}

function fillRegistration() {
  fireEvent.change(screen.getByLabelText('Логин'), { target: { value: 'ivan' } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ivan@example.com' } })
  fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'password12' } })
  fireEvent.change(screen.getByLabelText('Повторите пароль'), { target: { value: 'password12' } })
}

describe('согласие при регистрации', () => {
  beforeEach(() => {
    mocks.login.mockReset()
    mocks.register.mockReset()
  })

  it('не вызывает register(), пока согласие не отмечено, и показывает ошибку', async () => {
    renderLogin('/login?tab=register')
    fillRegistration()

    fireEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }))

    expect(await screen.findByText(CONSENT_ERROR)).toBeInTheDocument()
    expect(mocks.register).not.toHaveBeenCalled()
  })

  it('вызывает register() после отметки согласия и не шлёт его в запрос', async () => {
    renderLogin('/login?tab=register')
    fillRegistration()

    const policyLink = screen.getByRole('link', { name: 'политикой обработки персональных данных' })
    const termsLink = screen.getByRole('link', { name: 'пользовательское соглашение' })
    expect(policyLink).toHaveAttribute('href', '/privacy')
    expect(termsLink).toHaveAttribute('href', '/terms')

    const consent = screen.getByRole('checkbox', { name: /политикой обработки персональных данных/ })
    fireEvent.click(policyLink)
    expect(consent).not.toBeChecked()

    fireEvent.click(consent)
    fireEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }))

    await waitFor(() => expect(mocks.register).toHaveBeenCalledTimes(1))
    expect(mocks.register).toHaveBeenCalledWith(
      {
        role: 'client',
        login: 'ivan',
        email: 'ivan@example.com',
        password: 'password12',
      },
      expect.any(Object),
    )
  })

  it('вход существующего пользователя не требует согласия', async () => {
    renderLogin('/login')

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Политика обработки персональных данных' })).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: 'Пользовательское соглашение' })).toHaveAttribute('href', '/terms')

    fireEvent.change(screen.getByLabelText('Email или логин'), { target: { value: 'ivan@example.com' } })
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'password12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))

    await waitFor(() => expect(mocks.login).toHaveBeenCalledTimes(1))
    expect(mocks.register).not.toHaveBeenCalled()
  })
})

describe('страницы политики и соглашения', () => {
  it('показывает черновик политики с целями, категориями и отдельным согласием на здоровье', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicyPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Политика обработки персональных данных' })).toBeInTheDocument()
    expect(screen.getByText(/электронная почта/)).toBeInTheDocument()
    expect(screen.getByText(/данные профиля/)).toBeInTheDocument()
    expect(screen.getByText(/тренировочные планы, упражнения и отметки о выполнении/)).toBeInTheDocument()
    expect(screen.getByText(/Уведомления в Telegram/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Сведения о здоровье' })).toBeInTheDocument()
    expect(screen.getByText(/Перед сохранением таких полей и перед показом их тренеру понадобится отдельное согласие/)).toBeInTheDocument()
    expect(screen.getAllByText(/TODO для юриста/).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Ко входу' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Пользовательское соглашение' })).toHaveAttribute('href', '/terms')
  })

  it('показывает черновик оферты', () => {
    render(
      <MemoryRouter>
        <UserAgreementPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Пользовательское соглашение' })).toBeInTheDocument()
    expect(screen.getByText(/публичной оферты/)).toBeInTheDocument()
    expect(screen.getByText(/Вход в уже существующий аккаунт этого согласия не требует/)).toBeInTheDocument()
    expect(screen.getByText(/не оказывает медицинские услуги/)).toBeInTheDocument()
    expect(screen.getAllByText(/TODO для юриста/).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Политика обработки персональных данных' })).toHaveAttribute('href', '/privacy')
  })
})

describe('публичные маршруты документов', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.getState().clearSession()
  })

  function renderAt(path: string) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('открывает политику и соглашение без входа', async () => {
    const { unmount } = renderAt('/privacy')
    expect(await screen.findByRole('heading', { name: 'Политика обработки персональных данных' })).toBeInTheDocument()
    expect(document.title).toBe('Fitboddy — Политика обработки персональных данных')
    unmount()

    renderAt('/terms')
    expect(await screen.findByRole('heading', { name: 'Пользовательское соглашение' })).toBeInTheDocument()
    expect(document.title).toBe('Fitboddy — Пользовательское соглашение')
  })
})
