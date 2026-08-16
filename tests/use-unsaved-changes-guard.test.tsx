import { cleanup, renderHook } from '@testing-library/react'

import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesGuard,
} from '../src/hooks/use-unsaved-changes-guard'

describe('useUnsavedChangesGuard', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    window.history.replaceState(null, '', '/')
  })

  it('предотвращает browser unload только при изменениях', () => {
    const { rerender } = renderHook(
      ({ dirty }) => useUnsavedChangesGuard(dirty),
      { initialProps: { dirty: false } },
    )

    const cleanEvent = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(cleanEvent)
    expect(cleanEvent.defaultPrevented).toBe(false)

    rerender({ dirty: true })
    const dirtyEvent = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirtyEvent)
    expect(dirtyEvent.defaultPrevented).toBe(true)
  })

  it('отменяет SPA navigation, когда пользователь не подтвердил уход', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderHook(() => useUnsavedChangesGuard(true))

    window.history.pushState(null, '', '/blocked')

    expect(window.location.pathname).toBe('/')
    expect(confirm).toHaveBeenCalledWith(UNSAVED_CHANGES_MESSAGE)
  })

  it('разрешает SPA navigation после подтверждения', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderHook(() => useUnsavedChangesGuard(true))

    window.history.pushState(null, '', '/allowed')

    expect(window.location.pathname).toBe('/allowed')
  })
})
