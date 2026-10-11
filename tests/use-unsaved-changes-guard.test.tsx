import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { createMemoryRouter, Link, Route, RouterProvider, Routes } from 'react-router-dom'

import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesGuard,
} from '../src/hooks/use-unsaved-changes-guard'

function GuardedPage({ dirty }: { dirty: boolean }) {
  useUnsavedChangesGuard(dirty)
  return <Link to="/other">Уйти</Link>
}

function DirtyTogglePage() {
  const [dirty, setDirty] = useState(false)
  useUnsavedChangesGuard(dirty)
  return (
    <button type="button" onClick={() => setDirty(true)}>
      Изменить
    </button>
  )
}

function renderGuarded(dirty: boolean) {
  const router = createMemoryRouter([
    {
      path: '*',
      element: (
        <Routes>
          <Route path="/" element={<GuardedPage dirty={dirty} />} />
          <Route path="/other" element={<div>Другая страница</div>} />
        </Routes>
      ),
    },
  ])
  render(<RouterProvider router={router} />)
  return router
}

describe('useUnsavedChangesGuard', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('предотвращает browser unload только при изменениях', () => {
    const router = createMemoryRouter([{ path: '*', element: <DirtyTogglePage /> }])
    render(<RouterProvider router={router} />)

    const cleanEvent = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(cleanEvent)
    expect(cleanEvent.defaultPrevented).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Изменить' }))
    const dirtyEvent = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirtyEvent)
    expect(dirtyEvent.defaultPrevented).toBe(true)
  })

  it('отменяет SPA navigation, когда пользователь не подтвердил уход', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const router = renderGuarded(true)

    fireEvent.click(screen.getByRole('link', { name: 'Уйти' }))

    expect(screen.queryByText('Другая страница')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(confirm).toHaveBeenCalledWith(UNSAVED_CHANGES_MESSAGE)
  })

  it('разрешает SPA navigation после подтверждения', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderGuarded(true)

    fireEvent.click(screen.getByRole('link', { name: 'Уйти' }))

    expect(await screen.findByText('Другая страница')).toBeInTheDocument()
  })

  it('не спрашивает подтверждение, если изменений нет', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderGuarded(false)

    fireEvent.click(screen.getByRole('link', { name: 'Уйти' }))

    expect(await screen.findByText('Другая страница')).toBeInTheDocument()
    expect(confirm).not.toHaveBeenCalled()
  })
})
