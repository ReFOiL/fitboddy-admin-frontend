import axios from 'axios'

const DETAIL_TRANSLATIONS: Record<string, string> = {
  'invalid credentials': 'Неверный логин, email или пароль.',
  'user is inactive': 'Учётная запись отключена. Обратитесь в поддержку.',
  'user with this login already exists': 'Пользователь с таким логином уже существует.',
  'user with this email already exists': 'Пользователь с такой почтой уже существует.',
  'user already exists': 'Такой пользователь уже зарегистрирован.',
  'active trainer-client relation required': 'Для переписки нужна активная связь с тренером.',
  'conversation is read-only': 'Эта переписка доступна только для чтения.',
  'message rate limit exceeded': 'Слишком много сообщений. Подождите минуту и попробуйте снова.',
  'client already connected to this trainer': 'Вы уже подключены к этому тренеру.',
  'client already has active relation': 'У вас уже есть активный тренер.',
  'relation already closed': 'Эта связь уже завершена.',
  'questionnaire is incomplete: fill profile before plan generation':
    'Сначала заполните анкету, чтобы создать план.',
  'user already has an active plan': 'У вас уже есть активный план.',
  'workout already completed': 'Эта тренировка уже завершена.',
  'cannot replace exercise in completed workout': 'В завершённой тренировке нельзя заменить упражнение.',
  'no replacement exercise available': 'Подходящей замены сейчас нет.',
  'no exercises matched profile constraints': 'Не удалось подобрать упражнения под указанные условия.',
  'failed to build workout schedule': 'Не удалось составить расписание тренировок.',
  'working_weight_kg must be > 0': 'Рабочий вес должен быть больше нуля.',
}

function normalizeDetail(detail: string): string {
  return detail.trim().replace(/[.!]+$/, '').toLowerCase()
}

function translateDetail(detail: unknown): string | null {
  if (typeof detail !== 'string' || !detail.trim()) return null
  const translated = DETAIL_TRANSLATIONS[normalizeDetail(detail)]
  if (translated) return translated

  // Русский текст от API уже подходит пользователю. Не показываем неизвестные
  // англоязычные или технические детали.
  return /[а-яё]/i.test(detail) ? detail.trim() : null
}

export function getUserErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback

  const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail
  const translated = translateDetail(detail)
  if (translated) return translated

  if (!error.response) return 'Не удалось связаться с сервером. Проверьте интернет-соединение.'

  switch (error.response.status) {
    case 401:
      return 'Не удалось подтвердить данные. Проверьте введённую информацию.'
    case 403:
      return 'У вас нет доступа к этому действию.'
    case 404:
      return 'Запрошенные данные не найдены.'
    case 409:
      return 'Данные уже существуют или были изменены. Обновите страницу и попробуйте снова.'
    case 422:
      return 'Проверьте заполненные поля.'
    case 429:
      return 'Слишком много попыток. Подождите немного и повторите.'
    default:
      return error.response.status >= 500 ? 'Сервис временно недоступен. Попробуйте позже.' : fallback
  }
}
