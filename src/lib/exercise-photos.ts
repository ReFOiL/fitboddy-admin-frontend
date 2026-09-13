import type { ExercisePhotoPosition } from '../types/exercise'

export type { ExercisePhotoPosition }

export const EXERCISE_PHOTO_POSITIONS: ExercisePhotoPosition[] = ['start', 'end']

export const EXERCISE_PHOTO_MAX_BYTES = 15 * 1024 * 1024

export const EXERCISE_PHOTO_ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'

export const EXERCISE_PHOTO_HINT = 'Поддерживаются JPG, PNG и WEBP, до 15 МБ.'

export const EXERCISE_PHOTO_LABELS: Record<ExercisePhotoPosition, string> = {
  start: 'Исходное положение',
  end: 'Конечное положение',
}

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function photoUrlField(position: ExercisePhotoPosition): 'start_image_url' | 'end_image_url' {
  return position === 'start' ? 'start_image_url' : 'end_image_url'
}

export function trainerExercisePhotoPath(
  trainerUserId: string,
  rowId: string,
  position: ExercisePhotoPosition,
): string {
  return `/api/v1/trainers/${encodeURIComponent(trainerUserId)}/exercises/${encodeURIComponent(rowId)}/photos/${position}`
}

export function adminPlatformExercisePhotoPath(rowId: string, position: ExercisePhotoPosition): string {
  return `/api/v1/admin/platform-exercises/${encodeURIComponent(rowId)}/photos/${position}`
}

export function getExercisePhotoUrl(
  exercise: { start_image_url?: string | null; end_image_url?: string | null } | null | undefined,
  position: ExercisePhotoPosition,
): string | null {
  const url = position === 'start' ? exercise?.start_image_url : exercise?.end_image_url
  return typeof url === 'string' && url.trim() ? url : null
}

export function validateExercisePhotoFile(file: File): string | null {
  if (file.size > EXERCISE_PHOTO_MAX_BYTES) {
    return 'Фото слишком большое. Максимум 15 МБ.'
  }

  const extension = file.name.includes('.') ? `.${file.name.split('.').pop()?.toLowerCase() ?? ''}` : ''
  const mimeType = file.type.trim().toLowerCase()
  const extensionAllowed = ALLOWED_EXTENSIONS.has(extension)
  const mimeAllowed = mimeType.length === 0 || ALLOWED_MIME_TYPES.has(mimeType)

  if (!extensionAllowed || !mimeAllowed) {
    return 'Можно загрузить JPG, PNG или WEBP.'
  }

  return null
}
