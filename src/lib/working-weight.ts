export type WorkingWeightDraft =
  | { state: 'empty' }
  | { state: 'invalid' }
  | { state: 'valid'; value: number }

/** Пустая строка — вес не меняем. Запятая и точка оба допустимы. Ноль и текст — ошибка. */
export function readWorkingWeight(raw: string): WorkingWeightDraft {
  const normalized = raw.trim().replace(',', '.')
  if (!normalized) return { state: 'empty' }
  const value = Number(normalized)
  if (!Number.isFinite(value) || value <= 0) return { state: 'invalid' }
  return { state: 'valid', value }
}
