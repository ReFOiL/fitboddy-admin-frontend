import { describe, expect, it } from 'vitest'

import {
  EXERCISE_PHOTO_INVALID_FORMAT_MESSAGE,
  EXERCISE_PHOTO_TOO_LARGE_MESSAGE,
} from '../src/lib/exercise-photos'
import { getUserErrorMessage } from '../src/lib/user-error-message'

function apiError(status: number, detail?: unknown, url?: string) {
  return {
    isAxiosError: true,
    config: url === undefined ? undefined : { url },
    response: {
      status,
      data: detail === undefined ? undefined : { detail },
    },
  }
}

describe('getUserErrorMessage', () => {
  it('переводит ошибку авторизации', () => {
    expect(getUserErrorMessage(apiError(401, 'Invalid credentials.'), 'Не удалось войти.')).toBe(
      'Неверный логин, email или пароль.',
    )
  })

  it('не показывает неизвестный технический текст', () => {
    expect(getUserErrorMessage(apiError(500, 'database connection refused'), 'Не удалось сохранить.')).toBe(
      'Сервис временно недоступен. Попробуйте позже.',
    )
  })

  it('сохраняет понятный русский текст API', () => {
    expect(getUserErrorMessage(apiError(422, 'Проверьте выбранную цель'), 'Не удалось сохранить.')).toBe(
      'Проверьте выбранную цель',
    )
  })

  it('показывает понятные сообщения для слишком большого и неподдерживаемого фото', () => {
    const photoUrl = '/api/v1/trainers/t/exercises/r/photos/start'
    expect(getUserErrorMessage(apiError(413, undefined, photoUrl), 'Не удалось загрузить фото.')).toBe(
      EXERCISE_PHOTO_TOO_LARGE_MESSAGE,
    )
    expect(getUserErrorMessage(apiError(415, 'Unsupported Media Type', photoUrl), 'Не удалось загрузить фото.')).toBe(
      EXERCISE_PHOTO_INVALID_FORMAT_MESSAGE,
    )
    expect(getUserErrorMessage(apiError(413, 'Файл больше допустимого размера', photoUrl), 'Не удалось загрузить фото.')).toBe(
      'Файл больше допустимого размера',
    )
    expect(
      getUserErrorMessage(apiError(413, undefined, '/api/v1/trainers/t/exercises/r/video'), 'Не удалось загрузить видео.'),
    ).toBe('Не удалось загрузить видео.')
  })

  it('показывает понятное сообщение при отсутствии сети', () => {
    expect(
      getUserErrorMessage({ isAxiosError: true }, 'Не удалось сохранить.'),
    ).toBe('Не удалось связаться с сервером. Проверьте интернет-соединение.')
  })
})
