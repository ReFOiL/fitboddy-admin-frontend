import { useCallback, useEffect, useRef } from 'react'
import { useBeforeUnload } from 'react-router-dom'

export const UNSAVED_CHANGES_MESSAGE = 'Есть несохранённые изменения. Покинуть страницу?'

export function useUnsavedChangesGuard(
  isDirty: boolean,
  message = UNSAVED_CHANGES_MESSAGE,
) {
  const isDirtyRef = useRef(isDirty)
  const messageRef = useRef(message)

  useEffect(() => {
    isDirtyRef.current = isDirty
    messageRef.current = message
  }, [isDirty, message])

  useBeforeUnload(
    useCallback((event) => {
      if (!isDirtyRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }, []),
  )

  useEffect(() => {
    if (!isDirty) return

    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState

    const shouldNavigate = () =>
      !isDirtyRef.current || window.confirm(messageRef.current)

    window.history.pushState = function pushState(...args) {
      if (shouldNavigate()) {
        originalPushState.apply(this, args)
      }
    }

    window.history.replaceState = function replaceState(...args) {
      if (shouldNavigate()) {
        originalReplaceState.apply(this, args)
      }
    }

    return () => {
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
    }
  }, [isDirty])
}
