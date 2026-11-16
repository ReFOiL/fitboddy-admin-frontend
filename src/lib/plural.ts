/**
 * Русское склонение по числу: 1 тренировка, 2 тренировки, 5 тренировок.
 * 11–14 идут в форму «много», как и 0.
 */
export function plural(count: number, one: string, few: string, many: string): string {
  const value = Math.abs(Math.trunc(count))
  const mod10 = value % 10
  const mod100 = value % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}
