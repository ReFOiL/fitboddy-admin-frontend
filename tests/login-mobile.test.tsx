import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { DEFAULT_REGISTRATION_ROLE, LoginPage } from '../src/pages/Login'

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

describe('LoginPage mobile-first', () => {
  it('показывает форму первой визуально и регистрирует клиента по умолчанию', () => {
    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    const authCard = screen.getByRole('heading', { name: 'Вход в аккаунт' }).closest('[data-slot="card"]')
      ?? screen.getByRole('heading', { name: 'Вход в аккаунт' }).parentElement?.parentElement
    expect(authCard).toHaveClass('order-1')

    expect(DEFAULT_REGISTRATION_ROLE).toBe('client')

    const passwordToggles = screen.getAllByRole('button', { name: /пароль/i })
    expect(passwordToggles.every((button) => button.className.includes('size-11'))).toBe(true)
    expect(container.querySelectorAll('input').length).toBeGreaterThan(0)
  })
})
