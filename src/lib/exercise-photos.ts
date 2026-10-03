import type { ExercisePhotoPosition } from '../types/exercise'

export type { ExercisePhotoPosition }

// Общий контракт фото упражнения (старт/финиш). Поддержка сверяет лимиты с этими константами.
export const EXERCISE_PHOTO_POSITIONS: ExercisePhotoPosition[] = ['start', 'end']

export const EXERCISE_PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const

export const EXERCISE_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const EXERCISE_PHOTO_MAX_BYTES = 15 * 1024 * 1024

// Общий таймаут axios (12 с) обрывает 15 МБ на медленной сети.
export const EXERCISE_PHOTO_UPLOAD_TIMEOUT_MS = 5 * 60 * 1000

export const EXERCISE_PHOTO_TOO_LARGE_MESSAGE = 'Фото слишком большое. Максимум 15 МБ.'

export const EXERCISE_PHOTO_INVALID_FORMAT_MESSAGE = 'Можно загрузить JPG, PNG или WEBP.'

export const EXERCISE_PHOTO_ACCEPT = [...EXERCISE_PHOTO_EXTENSIONS, ...EXERCISE_PHOTO_MIME_TYPES].join(',')

export const EXERCISE_PHOTO_HINT = 'Поддерживаются JPG, PNG и WEBP, до 15 МБ.'

export const EXERCISE_PHOTO_LABELS: Record<ExercisePhotoPosition, string> = {
  start: 'Исходное положение',
  end: 'Конечное положение',
}

// Подписанные URL живут недолго: карточку упражнения обновляем при открытии и возврате на вкладку.
export const EXERCISE_PHOTO_QUERY_OPTIONS = {
  staleTime: 0,
  refetchOnMount: 'always',
  refetchOnWindowFocus: true,
} as const

const ALLOWED_EXTENSIONS = new Set<string>(EXERCISE_PHOTO_EXTENSIONS)
const ALLOWED_MIME_TYPES = new Set<string>(EXERCISE_PHOTO_MIME_TYPES)

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

function readPlatformApiBaseUrl(): string {
  return import.meta.env.VITE_PLATFORM_API_URL || ''
}

function isOpaqueMediaUrl(url: string): boolean {
  return /^[a-z][a-z\d+\-.]*:/i.test(url) || url.startsWith('//')
}

// Относительный путь (например /api/v1/.../media?exp=&sig=) резолвим от базы API.
// Саму строку не разбираем и не пересобираем: подпись должна остаться как пришла.
export function resolveExerciseMediaUrl(
  url: string | null | undefined,
  apiBaseUrl: string = readPlatformApiBaseUrl(),
): string | null {
  if (typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null

  if (isOpaqueMediaUrl(trimmed)) return trimmed

  const base = apiBaseUrl.trim().replace(/\/+$/, '')
  if (!base) return trimmed

  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `${base}${path}`
}

export function validateExercisePhotoFile(file: File): string | null {
  if (file.size > EXERCISE_PHOTO_MAX_BYTES) {
    return EXERCISE_PHOTO_TOO_LARGE_MESSAGE
  }

  const extension = file.name.includes('.') ? `.${file.name.split('.').pop()?.toLowerCase() ?? ''}` : ''
  const mimeType = file.type.trim().toLowerCase()
  const extensionAllowed = ALLOWED_EXTENSIONS.has(extension)
  // Пустой MIME оставляем: часть браузеров не заполняет File.type. Если тип задан, он обязан быть из списка.
  const mimeAllowed = mimeType.length === 0 || ALLOWED_MIME_TYPES.has(mimeType)

  if (!extensionAllowed || !mimeAllowed) {
    return EXERCISE_PHOTO_INVALID_FORMAT_MESSAGE
  }

  return null
}
