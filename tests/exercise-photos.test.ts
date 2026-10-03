import { describe, expect, it } from 'vitest'

import {
  adminPlatformExercisePhotoPath,
  EXERCISE_PHOTO_ACCEPT,
  EXERCISE_PHOTO_EXTENSIONS,
  EXERCISE_PHOTO_INVALID_FORMAT_MESSAGE,
  EXERCISE_PHOTO_MAX_BYTES,
  EXERCISE_PHOTO_MIME_TYPES,
  EXERCISE_PHOTO_QUERY_OPTIONS,
  EXERCISE_PHOTO_TOO_LARGE_MESSAGE,
  getExercisePhotoUrl,
  photoUrlField,
  resolveExerciseMediaUrl,
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

  it('reads stored urls without rewriting the signature', () => {
    const signed = '/api/v1/trainers/media/start?exp=1710000000&sig=ab+cd%2Fef'
    expect(getExercisePhotoUrl({ start_image_url: signed, end_image_url: '/media/end.png' }, 'start')).toBe(signed)
    expect(getExercisePhotoUrl({ start_image_url: null, end_image_url: '  ' }, 'end')).toBeNull()
    expect(getExercisePhotoUrl(undefined, 'start')).toBeNull()
  })

  it('resolves relative media urls against the API base and leaves absolute urls untouched', () => {
    const signed = '/api/v1/trainers/media/start?exp=1710000000&sig=ab+cd%2Fef%3D'
    expect(resolveExerciseMediaUrl(signed, 'https://api.example.test')).toBe(
      `https://api.example.test${signed}`,
    )
    expect(resolveExerciseMediaUrl(signed, 'https://api.example.test/')).toBe(
      `https://api.example.test${signed}`,
    )
    expect(resolveExerciseMediaUrl(signed, 'https://api.example.test/gateway')).toBe(
      `https://api.example.test/gateway${signed}`,
    )
    expect(resolveExerciseMediaUrl(`  ${signed}  `, 'https://api.example.test')).toBe(
      `https://api.example.test${signed}`,
    )
    expect(resolveExerciseMediaUrl('media/start.jpg?sig=1', 'https://api.example.test')).toBe(
      'https://api.example.test/media/start.jpg?sig=1',
    )
    expect(resolveExerciseMediaUrl(signed, '')).toBe(signed)
    expect(resolveExerciseMediaUrl(signed, '   ')).toBe(signed)
    expect(resolveExerciseMediaUrl('https://cdn.example.test/a.jpg?sig=ab+cd', 'https://api.example.test')).toBe(
      'https://cdn.example.test/a.jpg?sig=ab+cd',
    )
    expect(resolveExerciseMediaUrl('//cdn.example.test/a.jpg?sig=1', 'https://api.example.test')).toBe(
      '//cdn.example.test/a.jpg?sig=1',
    )
    expect(resolveExerciseMediaUrl('data:image/png;base64,aaaa', 'https://api.example.test')).toBe(
      'data:image/png;base64,aaaa',
    )
    expect(resolveExerciseMediaUrl(null, 'https://api.example.test')).toBeNull()
    expect(resolveExerciseMediaUrl('   ', 'https://api.example.test')).toBeNull()
  })

  it('shares one photo contract for extensions, mime types and size', () => {
    expect(EXERCISE_PHOTO_EXTENSIONS).toEqual(['.jpg', '.jpeg', '.png', '.webp'])
    expect(EXERCISE_PHOTO_MIME_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp'])
    expect(EXERCISE_PHOTO_MAX_BYTES).toBe(15 * 1024 * 1024)
    expect(EXERCISE_PHOTO_ACCEPT).toBe('.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp')
    expect(EXERCISE_PHOTO_QUERY_OPTIONS).toEqual({
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    })
  })

  it('accepts jpg/jpeg/png/webp up to 15MB when extension and mime are both allowed', () => {
    expect(validateExercisePhotoFile(photoFile('start.jpg'))).toBeNull()
    expect(validateExercisePhotoFile(photoFile('start.JPEG', { type: 'image/jpeg' }))).toBeNull()
    expect(validateExercisePhotoFile(photoFile('end.png', { type: 'image/png' }))).toBeNull()
    expect(validateExercisePhotoFile(photoFile('end.webp', { type: 'image/webp' }))).toBeNull()
    expect(validateExercisePhotoFile(photoFile('legacy.jpg', { type: '' }))).toBeNull()
    expect(validateExercisePhotoFile(photoFile('start.jpg', { size: EXERCISE_PHOTO_MAX_BYTES }))).toBeNull()
    expect(validateExercisePhotoFile(photoFile('start.jpg', { type: 'image/png' }))).toBeNull()
  })

  it('rejects oversized or unsupported files with a friendly message', () => {
    expect(validateExercisePhotoFile(photoFile('start.jpg', { size: EXERCISE_PHOTO_MAX_BYTES + 1 }))).toBe(
      EXERCISE_PHOTO_TOO_LARGE_MESSAGE,
    )
    expect(validateExercisePhotoFile(photoFile('clip.mp4', { type: 'video/mp4' }))).toBe(
      EXERCISE_PHOTO_INVALID_FORMAT_MESSAGE,
    )
    expect(validateExercisePhotoFile(photoFile('notes.gif', { type: 'image/gif' }))).toBe(
      EXERCISE_PHOTO_INVALID_FORMAT_MESSAGE,
    )
    expect(validateExercisePhotoFile(photoFile('start.jpg', { type: 'image/gif' }))).toBe(
      EXERCISE_PHOTO_INVALID_FORMAT_MESSAGE,
    )
    expect(validateExercisePhotoFile(photoFile('start.gif', { type: 'image/jpeg' }))).toBe(
      EXERCISE_PHOTO_INVALID_FORMAT_MESSAGE,
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

    expect(getUserErrorMessage(tooLarge, 'Не удалось загрузить фото.')).toBe(EXERCISE_PHOTO_TOO_LARGE_MESSAGE)
    expect(getUserErrorMessage(badFormat, 'Не удалось загрузить фото.')).toBe(
      EXERCISE_PHOTO_INVALID_FORMAT_MESSAGE,
    )
  })
})
