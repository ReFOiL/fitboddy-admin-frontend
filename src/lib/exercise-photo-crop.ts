import type { ExercisePhotoPosition } from '../types/exercise'

/** Горизонтальный кадр старта и финиша. */
export const EXERCISE_PHOTO_ASPECT_WIDTH = 4
export const EXERCISE_PHOTO_ASPECT_HEIGHT = 3
export const EXERCISE_PHOTO_ASPECT = EXERCISE_PHOTO_ASPECT_WIDTH / EXERCISE_PHOTO_ASPECT_HEIGHT

/** Длинная сторона готового файла. Телефонные 12 Мп сюда не проходят. */
export const EXERCISE_PHOTO_EXPORT_MAX_EDGE = 1600

export const EXERCISE_PHOTO_EXPORT_QUALITY = 0.8

export const EXERCISE_PHOTO_CROP_TITLES: Record<ExercisePhotoPosition, string> = {
  start: 'Кадр старта',
  end: 'Кадр финиша',
}

export const EXERCISE_PHOTO_FRAME_CAPTIONS: Record<ExercisePhotoPosition, string> = {
  start: 'Старт · 4:3',
  end: 'Финиш · 4:3',
}

export const EXERCISE_PHOTO_SHORT_LABELS: Record<ExercisePhotoPosition, string> = {
  start: 'Старт',
  end: 'Финиш',
}

export const EXERCISE_PHOTO_CROP_HINT =
  'Перетащи фото и масштабируй — в кадр попадёт только то, что внутри рамки.'

export const EXERCISE_PHOTO_ASPECT_HINT =
  'Кадр всегда 4:3 — в каталоге и у клиента фото не раздувает экран.'

export const EXERCISE_PHOTO_CROP_FAILED_MESSAGE = 'Не удалось обрезать фото. Попробуйте другой файл.'

export type ExercisePhotoPixelCrop = {
  x: number
  y: number
  width: number
  height: number
}

export type ExercisePhotoExportMime = 'image/jpeg' | 'image/webp'

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

/** Область кадра не вылезает за пиксели исходника. */
export function clampPixelCrop(
  crop: ExercisePhotoPixelCrop,
  imageWidth: number,
  imageHeight: number,
): ExercisePhotoPixelCrop {
  const maxWidth = Math.max(1, imageWidth)
  const maxHeight = Math.max(1, imageHeight)
  const width = clamp(crop.width, 1, maxWidth)
  const height = clamp(crop.height, 1, maxHeight)
  return {
    x: clamp(crop.x, 0, maxWidth - width),
    y: clamp(crop.y, 0, maxHeight - height),
    width,
    height,
  }
}

/**
 * Размер файла: ровно 4:3, длинная сторона не больше maxEdge.
 * Ширина кратна 4, чтобы высота 3/4 осталась целым числом.
 */
export function exercisePhotoExportSize(
  cropWidth: number,
  cropHeight: number,
  maxEdge = EXERCISE_PHOTO_EXPORT_MAX_EDGE,
): { width: number; height: number } {
  if (!Number.isFinite(cropWidth) || !Number.isFinite(cropHeight) || cropWidth <= 0 || cropHeight <= 0) {
    throw new Error('Некорректная область кадра.')
  }
  if (!Number.isFinite(maxEdge) || maxEdge < 4) {
    throw new Error('Некорректный размер кадра.')
  }
  const longest = Math.max(cropWidth, cropHeight)
  const limit = Math.min(longest, maxEdge)
  let width = Math.floor(limit / 4) * 4
  if (width < 4) width = 4
  return { width, height: (width * 3) / 4 }
}

export function exercisePhotoExportFileName(position: ExercisePhotoPosition, mime: ExercisePhotoExportMime): string {
  return `${position}.${extensionForMime(mime)}`
}

function extensionForMime(mime: ExercisePhotoExportMime): 'jpg' | 'webp' {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/webp':
      return 'webp'
    default: {
      const unexpected: never = mime
      return unexpected
    }
  }
}

export function canvasSupportsWebp(): boolean {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const url = canvas.toDataURL('image/webp')
    return typeof url === 'string' && url.startsWith('data:image/webp')
  } catch {
    return false
  }
}

function readSourceSize(source: CanvasImageSource): { width: number; height: number } | null {
  if (source instanceof HTMLImageElement) return positiveSize(source.naturalWidth, source.naturalHeight)
  if (source instanceof HTMLCanvasElement) return positiveSize(source.width, source.height)
  if (source instanceof HTMLVideoElement) return positiveSize(source.videoWidth, source.videoHeight)
  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) return positiveSize(source.width, source.height)
  if (typeof OffscreenCanvas !== 'undefined' && source instanceof OffscreenCanvas) {
    return positiveSize(source.width, source.height)
  }
  return null
}

function positiveSize(width: number, height: number): { width: number; height: number } | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  return { width, height }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== 'function') {
      reject(new Error('Не удалось подготовить кадр.'))
      return
    }
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Не удалось подготовить кадр.'))
          return
        }
        resolve(blob)
      },
      type,
      quality,
    )
  })
}

function blobMatches(blob: Blob, mime: ExercisePhotoExportMime): boolean {
  return blob.type === mime || blob.type === ''
}

async function encodeExercisePhoto(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<{ blob: Blob; mime: ExercisePhotoExportMime }> {
  if (canvasSupportsWebp()) {
    try {
      const webp = await canvasToBlob(canvas, 'image/webp', quality)
      // Берём WebP только когда браузер сам проставил тип. Иначе кадр уйдёт как JPEG.
      if (webp.type === 'image/webp') {
        return { blob: webp, mime: 'image/webp' }
      }
    } catch {
      // Ниже сожмём в JPEG.
    }
  }
  const jpeg = await canvasToBlob(canvas, 'image/jpeg', quality)
  if (!blobMatches(jpeg, 'image/jpeg')) {
    throw new Error('Не удалось подготовить кадр.')
  }
  return { blob: jpeg, mime: 'image/jpeg' }
}

/**
 * Рисует выбранный кадр в 4:3 и отдаёт JPEG или WebP.
 * На сервер уходит этот файл, а не исходник с телефона.
 */
export async function cropAndCompressExercisePhoto(
  source: CanvasImageSource,
  crop: ExercisePhotoPixelCrop,
  options: {
    position: ExercisePhotoPosition
    quality?: number
    maxEdge?: number
  },
): Promise<File> {
  const sourceSize = readSourceSize(source)
  const pixelCrop = sourceSize ? clampPixelCrop(crop, sourceSize.width, sourceSize.height) : crop
  if (!Number.isFinite(pixelCrop.width) || !Number.isFinite(pixelCrop.height) || pixelCrop.width <= 0 || pixelCrop.height <= 0) {
    throw new Error('Некорректная область кадра.')
  }

  const { width, height } = exercisePhotoExportSize(pixelCrop.width, pixelCrop.height, options.maxEdge)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Не удалось подготовить кадр.')

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, width, height)

  const quality = options.quality ?? EXERCISE_PHOTO_EXPORT_QUALITY
  const { blob, mime } = await encodeExercisePhoto(canvas, quality)
  return new File([blob], exercisePhotoExportFileName(options.position, mime), {
    type: mime,
    lastModified: Date.now(),
  })
}

export function loadExercisePhoto(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      if (image.naturalWidth === 0 || image.naturalHeight === 0) {
        reject(new Error('Пустое фото.'))
        return
      }
      resolve(image)
    }
    image.onerror = () => reject(new Error('Не удалось прочитать фото.'))
    image.src = url
  })
}
