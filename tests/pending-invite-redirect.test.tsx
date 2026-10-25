import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { PendingInviteRedirect } from '../src/components/invite/PendingInviteRedirect'
import { savePendingInviteCode } from '../src/lib/invite'

const mocks = vi.hoisted(() => ({
  role: 'client' as string,
}))

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({ user: { role: mocks.role, user_id: 'user-1' } }),
}))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/home"
          element={
            <>
              <PendingInviteRedirect />
              <div>Главная</div>
            </>
          }
        />
        <Route
          path="/profile/onboarding"
          element={
            <>
              <PendingInviteRedirect />
              <div>Анкета</div>
            </>
          }
        />
        <Route path="/i/:code" element={<div>Лендинг приглашения</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PendingInviteRedirect', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mocks.role = 'client'
  })

  it('уводит клиента с главной на лендинг, чтобы принять код', async () => {
    savePendingInviteCode('AB3K9Z')
    renderAt('/home')
    expect(await screen.findByText('Лендинг приглашения')).toBeInTheDocument()
  })

  it('не прерывает анкету', () => {
    savePendingInviteCode('AB3K9Z')
    renderAt('/profile/onboarding')
    expect(screen.getByText('Анкета')).toBeInTheDocument()
    expect(screen.queryByText('Лендинг приглашения')).not.toBeInTheDocument()
  })
})
