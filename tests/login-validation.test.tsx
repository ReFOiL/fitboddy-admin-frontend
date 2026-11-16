import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { LoginPage } from '../src/pages/Login'
import { PENDING_INVITE_CODE_KEY } from '../src/lib/invite'

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({
    loginMutation: { mutate: vi.fn(), isPending: false, isError: false },
    registerMutation: { mutate: vi.fn(), isPending: false, isError: false },
  }),
}))

function renderLogin(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('регистрация и проверка полей', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('показывает роль двумя карточками и выбирает клиента по приглашению', () => {
    sessionStorage.setItem(PENDING_INVITE_CODE_KEY, 'AB3K9Z')
    renderLogin('/login?tab=register')

    expect(screen.getByRole('radio', { name: 'Я клиент' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Я тренер' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('По ссылке приглашения выбрана роль клиента.')).toBeInTheDocument()
    expect(screen.getByLabelText('Логин')).toHaveAttribute('placeholder', 'например, ivan')
  })

  it('показывает ошибку после ухода с поля и фокусирует первую при отправке', async () => {
    renderLogin('/login')
    const login = screen.getByLabelText('Email или логин')
    fireEvent.blur(login)

    expect(await screen.findByText('Укажите email или логин')).toBeInTheDocument()
    expect(screen.queryByText('Укажите пароль не короче 8 символов')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))
    expect(await screen.findByText('Укажите пароль не короче 8 символов')).toBeInTheDocument()
    await waitFor(() => expect(login).toHaveFocus())
  })
})
