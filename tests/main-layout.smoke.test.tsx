import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { MainLayout } from '../src/components/layout/MainLayout'

const mocks = vi.hoisted(() => ({
  role: 'client' as 'client' | 'trainer',
  unreadCount: 3,
}))

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { role: mocks.role, user_id: 'user-1', email: 'user@example.com' },
    logoutMutation: { mutate: vi.fn(), isPending: false },
  }),
}))

vi.mock('../src/hooks/use-messages', () => ({
  useMessagingSocket: vi.fn(),
  useUnreadCount: () => ({ data: { unread_count: mocks.unreadCount } }),
}))

function renderLayout(path = '/home') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="*" element={<div>Контент роли</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('MainLayout role smoke', () => {
  afterEach(() => {
    cleanup()
    mocks.role = 'client'
  })

  it('renders client navigation and unread badges', () => {
    mocks.role = 'client'
    renderLayout()

    expect(screen.getByText('Контент роли')).toBeInTheDocument()
    expect(screen.getAllByText('План').length).toBeGreaterThan(0)
    expect(screen.queryByText('Аналитика')).not.toBeInTheDocument()
    expect(screen.getAllByLabelText('3 непрочитанных').length).toBeGreaterThan(0)

    const mobileNav = screen.getByRole('navigation', { name: 'Мобильная навигация' })
    expect(within(mobileNav).getAllByRole('link')).toHaveLength(4)
    expect(within(mobileNav).getByRole('link', { name: 'Главная' })).toBeInTheDocument()
    expect(within(mobileNav).getByRole('link', { name: 'Чат, 3 непрочитанных' })).toBeInTheDocument()
    expect(within(mobileNav).getByRole('link', { name: 'Тренер' })).toBeInTheDocument()
    expect(within(mobileNav).getByRole('link', { name: 'Ещё' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Перейти к основному содержимому' })).toHaveAttribute('href', '#main-content')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
  })

  it('renders trainer-only navigation', () => {
    mocks.role = 'trainer'
    renderLayout()

    expect(screen.getAllByText('Клиенты').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Аналитика').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Каталог').length).toBeGreaterThan(0)
    expect(screen.queryByText('План')).not.toBeInTheDocument()
  })

  it('marks nested client routes through their parent tab', () => {
    mocks.role = 'client'
    renderLayout('/profile')

    const mobileNav = screen.getByRole('navigation', { name: 'Мобильная навигация' })
    expect(within(mobileNav).getByRole('link', { name: 'Ещё' })).toHaveAttribute('aria-current', 'page')
  })

  it('hides mobile tabs inside a chat thread', () => {
    renderLayout('/messages/conversation-1')

    expect(screen.getByRole('navigation', { name: 'Мобильная навигация' })).toHaveClass('hidden')
  })
})
