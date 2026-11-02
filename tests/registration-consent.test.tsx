import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import App from '../src/App'
import { LoginPage } from '../src/pages/Login'
import { PrivacyPolicyPage, UserAgreementPage } from '../src/pages/LegalDocumentPage'
import { useAuthStore } from '../src/stores/auth.store'

const PRIVACY_CONSENT_ERROR = 'Отметьте согласие на обработку персональных данных'
const TERMS_CONSENT_ERROR = 'Отметьте согласие с пользовательским соглашением'

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

  it('не вызывает register(), пока любое из двух согласий не отмечено', async () => {
    renderLogin('/login?tab=register')
    fillRegistration()

    const privacy = screen.getByRole('checkbox', { name: /согласие на обработку персональных данных/ })
    const terms = screen.getByRole('checkbox', { name: /пользовательское соглашение \(оферту\)/ })
    fireEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }))

    expect(await screen.findByText(PRIVACY_CONSENT_ERROR)).toBeInTheDocument()
    expect(screen.getByText(TERMS_CONSENT_ERROR)).toBeInTheDocument()
    expect(mocks.register).not.toHaveBeenCalled()

    fireEvent.click(privacy)
    fireEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }))
    expect(await screen.findByText(TERMS_CONSENT_ERROR)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText(PRIVACY_CONSENT_ERROR)).not.toBeInTheDocument())
    expect(mocks.register).not.toHaveBeenCalled()

    fireEvent.click(privacy)
    fireEvent.click(terms)
    fireEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }))
    expect(await screen.findByText(PRIVACY_CONSENT_ERROR)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText(TERMS_CONSENT_ERROR)).not.toBeInTheDocument())
    expect(mocks.register).not.toHaveBeenCalled()
  })

  it('вызывает register() только когда отмечены оба согласия и не шлёт их в запрос', async () => {
    renderLogin('/login?tab=register')
    fillRegistration()

    const policyLink = screen.getByRole('link', { name: 'согласие на обработку персональных данных' })
    const termsLink = screen.getByRole('link', { name: 'пользовательское соглашение (оферту)' })
    expect(policyLink).toHaveAttribute('href', '/privacy')
    expect(termsLink).toHaveAttribute('href', '/terms')

    const privacy = screen.getByRole('checkbox', { name: /согласие на обработку персональных данных/ })
    const terms = screen.getByRole('checkbox', { name: /пользовательское соглашение \(оферту\)/ })
    fireEvent.click(policyLink)
    expect(privacy).not.toBeChecked()
    expect(terms).not.toBeChecked()

    fireEvent.click(privacy)
    fireEvent.click(terms)
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

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
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
    expect(screen.queryByText(/TODO/)).not.toBeInTheDocument()
    expect(screen.queryByText(/юрист/i)).not.toBeInTheDocument()
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
    expect(screen.getByText(/Публичная оферта/)).toBeInTheDocument()
    expect(screen.getByText(/Вход в уже существующий аккаунт этих согласий не требует/)).toBeInTheDocument()
    expect(screen.getByText(/не оказывает медицинские услуги/)).toBeInTheDocument()
    expect(screen.queryByText(/TODO/)).not.toBeInTheDocument()
    expect(screen.queryByText(/юрист/i)).not.toBeInTheDocument()
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
