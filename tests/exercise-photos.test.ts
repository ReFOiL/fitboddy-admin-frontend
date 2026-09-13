import { describe, expect, it } from 'vitest'

import {
  adminPlatformExercisePhotoPath,
  EXERCISE_PHOTO_MAX_BYTES,
  getExercisePhotoUrl,
  photoUrlField,
  trainerExercisePhotoPath,
  validateExercisePhotoFile,
} from '../src/lib/exercise-photos'
import { getUserErrorMessage } from '../src/lib/user-error-message'

function photoFile(name: string, options?: { size?: number; type?: string }) {
  const size = options?.size ?? 1024
  return new File([new Uint8Array(size)], name, { type: options?.type ?? 'image/jpeg' })
}

describe('exercise photo helpers', () => {
  it('builds trainer and admin photo paths against the real API contract', () => {
    expect(trainerExercisePhotoPath('trainer 1', 'row 2', 'start')).toBe(
      '/api/v1/trainers/trainer%201/exercises/row%202/photos/start',
    )
    expect(trainerExercisePhotoPath('t1', 'r1', 'end')).toBe(
      '/api/v1/trainers/t1/exercises/r1/photos/end',
    )
    expect(adminPlatformExercisePhotoPath('row 9', 'start')).toBe(
      '/api/v1/admin/platform-exercises/row%209/photos/start',
    )
    expect(adminPlatformExercisePhotoPath('r9', 'end')).toBe(
      '/api/v1/admin/platform-exercises/r9/photos/end',
    )
  })

  it('maps positions to payload fields', () => {
    expect(photoUrlField('start')).toBe('start_image_url')
    expect(photoUrlField('end')).toBe('end_image_url')
  })

  it('reads start and end urls from exercise payloads', () => {
    expect(
      getExercisePhotoUrl({ start_image_url: '/media/start.jpg', end_image_url: '/media/end.png' }, 'start'),
    ).toBe('/media/start.jpg')
    expect(getExercisePhotoUrl({ start_image_url: null, end_image_url: '  ' }, 'end')).toBeNull()
    expect(getExercisePhotoUrl(undefined, 'start')).toBeNull()
  })

  it('accepts jpg/jpeg/png/webp up to 15MB', () => {
    expect(validateExercisePhotoFile(photoFile('start.jpg'))).toBeNull()
    expect(validateExercisePhotoFile(photoFile('start.JPEG', { type: 'image/jpeg' }))).toBeNull()
    expect(validateExercisePhotoFile(photoFile('end.png', { type: 'image/png' }))).toBeNull()
    expect(validateExercisePhotoFile(photoFile('end.webp', { type: 'image/webp' }))).toBeNull()
    expect(validateExercisePhotoFile(photoFile('legacy.jpg', { type: '' }))).toBeNull()
  })

  it('rejects oversized or unsupported files with a friendly message', () => {
    expect(validateExercisePhotoFile(photoFile('start.jpg', { size: EXERCISE_PHOTO_MAX_BYTES + 1 }))).toBe(
      'Фото слишком большое. Максимум 15 МБ.',
    )
    expect(validateExercisePhotoFile(photoFile('clip.mp4', { type: 'video/mp4' }))).toBe(
      'Можно загрузить JPG, PNG или WEBP.',
    )
    expect(validateExercisePhotoFile(photoFile('notes.gif', { type: 'image/gif' }))).toBe(
      'Можно загрузить JPG, PNG или WEBP.',
    )
  })

  it('переводит ошибки фото от API', () => {
    const tooLarge = {
      isAxiosError: true,
      response: { status: 422, data: { detail: 'photo is too large (max 15MB)' } },
    }
    const badFormat = {
      isAxiosError: true,
      response: { status: 422, data: { detail: 'invalid photo format (allowed: .jpg, .jpeg, .png, .webp)' } },
    }

    expect(getUserErrorMessage(tooLarge, 'Не удалось загрузить фото.')).toBe(
      'Фото слишком большое. Максимум 15 МБ.',
    )
    expect(getUserErrorMessage(badFormat, 'Не удалось загрузить фото.')).toBe(
      'Можно загрузить JPG, PNG или WEBP.',
    )
  })
})
