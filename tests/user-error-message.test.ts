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

  it('переводит конфликты и проверки плана', () => {
    expect(getUserErrorMessage(apiError(409, 'plan day already exists'), 'Не удалось.')).toBe(
      'Такой день уже есть в этой неделе.',
    )
    expect(getUserErrorMessage(apiError(422, 'cannot copy a day onto itself'), 'Не удалось.')).toBe(
      'Нельзя скопировать день на себя.',
    )
    expect(getUserErrorMessage(apiError(422, 'note must be at most 500 characters'), 'Не удалось.')).toBe(
      'Заметка не длиннее 500 символов.',
    )
    expect(getUserErrorMessage(apiError(422, 'scheduled_time must be HH:MM'), 'Не удалось.')).toBe(
      'Время укажите как ЧЧ:ММ.',
    )
  })

  it('показывает понятное сообщение при отсутствии сети', () => {
    expect(
      getUserErrorMessage({ isAxiosError: true }, 'Не удалось сохранить.'),
    ).toBe('Не удалось связаться с сервером. Проверьте интернет-соединение.')
  })
})
