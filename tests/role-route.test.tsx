import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { RoleRoute } from '../src/components/RoleRoute'

describe('RoleRoute', () => {
  it('renders protected content when role is allowed', () => {
    render(
      <MemoryRouter initialEntries={['/clients']}>
        <Routes>
          <Route
            path="/clients"
            element={
              <RoleRoute currentRole="trainer" allowedRoles={['trainer']} fallbackTo="/home">
                <div>Доступно</div>
              </RoleRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Доступно')).toBeInTheDocument()
  })

  it('redirects to fallback when role is not allowed', () => {
    render(
      <MemoryRouter initialEntries={['/clients']}>
        <Routes>
          <Route
            path="/clients"
            element={
              <RoleRoute currentRole="client" allowedRoles={['trainer']} fallbackTo="/home">
                <div>Скрыто</div>
              </RoleRoute>
            }
          />
          <Route path="/home" element={<div>Главная</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Главная')).toBeInTheDocument()
    expect(screen.queryByText('Скрыто')).not.toBeInTheDocument()
  })
})
