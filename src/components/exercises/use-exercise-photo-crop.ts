import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { validateExercisePhotoFile } from '../../lib/exercise-photos'
import type { ExercisePhotoPosition } from '../../types/exercise'

export type PendingExercisePhotoCrop = {
  position: ExercisePhotoPosition
  file: File
  url: string
}

export function useExercisePhotoCrop() {
  const [pending, setPending] = useState<PendingExercisePhotoCrop | null>(null)
  const pendingRef = useRef<PendingExercisePhotoCrop | null>(null)

  const openCrop = useCallback((position: ExercisePhotoPosition, file: File) => {
    const validationError = validateExercisePhotoFile(file)
    if (validationError) {
      toast.error(validationError)
      return false
    }
    const url = URL.createObjectURL(file)
    const previous = pendingRef.current
    if (previous) URL.revokeObjectURL(previous.url)
    const next = { position, file, url }
    pendingRef.current = next
    setPending(next)
    return true
  }, [])

  const closeCrop = useCallback(() => {
    const current = pendingRef.current
    if (current) URL.revokeObjectURL(current.url)
    pendingRef.current = null
    setPending(null)
  }, [])

  useEffect(() => {
    return () => {
      const current = pendingRef.current
      if (current) URL.revokeObjectURL(current.url)
    }
  }, [])

  return { pending, openCrop, closeCrop }
}
