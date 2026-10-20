import { useCallback, useEffect, useRef } from 'react'
import { useBeforeUnload, useBlocker, type BlockerFunction } from 'react-router-dom'

export const UNSAVED_CHANGES_MESSAGE = 'Есть несохранённые изменения. Покинуть страницу?'

export function useUnsavedChangesGuard(
  isDirty: boolean,
  message = UNSAVED_CHANGES_MESSAGE,
) {
  const resetOnceRef = useRef(false)

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!isDirty) return
        event.preventDefault()
        event.returnValue = ''
      },
      [isDirty],
    ),
  )

  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) => {
      if (!isDirty) return false
      const samePlace =
        currentLocation.pathname === nextLocation.pathname &&
        currentLocation.search === nextLocation.search
      if (samePlace) return false
      return !window.confirm(message)
    },
    [isDirty, message],
  )
  const blocker = useBlocker(shouldBlock)

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      resetOnceRef.current = false
      return
    }
    if (resetOnceRef.current) return
    resetOnceRef.current = true
    blocker.reset()
  }, [blocker])
}
