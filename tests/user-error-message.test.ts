import { describe, expect, it } from 'vitest'

import { getUserErrorMessage } from '../src/lib/user-error-message'

function apiError(status: number, detail?: unknown) {
  return {
    isAxiosError: true,
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

  it('показывает понятное сообщение при отсутствии сети', () => {
    expect(
      getUserErrorMessage({ isAxiosError: true }, 'Не удалось сохранить.'),
    ).toBe('Не удалось связаться с сервером. Проверьте интернет-соединение.')
  })
})
