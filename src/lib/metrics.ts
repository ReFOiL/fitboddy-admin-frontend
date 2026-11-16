const countFormat = new Intl.NumberFormat('ru')
const percentFormat = new Intl.NumberFormat('ru', { maximumFractionDigits: 1 })

/** Целые и большие числа: 1000 → «1 000». */
export function formatMetricCount(value: number): string {
  return countFormat.format(value)
}

/**
 * Сервер отдаёт проценты, не долю: 33.3 → «33,3 %».
 * style: 'percent' умножил бы значение на 100.
 */
export function formatMetricPercent(value: number): string {
  return `${percentFormat.format(value)} %`
}
