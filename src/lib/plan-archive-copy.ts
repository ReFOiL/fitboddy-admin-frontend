import { pluralPhrase } from './plural'

/**
 * Текст подтверждения «Собрать из каталога».
 * Считаем дни и упражнения текущего плана: сервер архивирует его и пишет новый.
 * Вернуть архив из приложения пока нельзя — это отдельная серверная задача.
 */
export function assembleReplacementCopy(days: number, exercises: number, unsaved: boolean): string {
  const daysLabel = pluralPhrase(days, ['день', 'дня', 'дней'])
  const exercisesLabel = pluralPhrase(exercises, ['упражнение', 'упражнения', 'упражнений'])
  const unsavedLine = unsaved ? ' Несохранённые правки на этом экране тоже пропадут.' : ''
  return `Текущий план будет заменён. В архив уйдут ${daysLabel} и ${exercisesLabel}. Ручные правки будут архивированы.${unsavedLine} Вернуть план из приложения пока нельзя.`
}
