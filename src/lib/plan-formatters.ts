import type { PlanExercise, SetPrescription } from '../types/plan'

export function textOrFallback(value: string | null | undefined): string {
  const normalized = value?.trim()
  return normalized ? normalized : 'Не указано'
}

export function formatPlanDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (match) {
    return `${Number(match[3])}.${match[2]}`
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const day = date.getDate()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}`
}

export function formatWeekdayShort(dayOfWeek: number): string {
  const labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  if (dayOfWeek >= 0 && dayOfWeek <= 6) return labels[dayOfWeek]
  if (dayOfWeek >= 1 && dayOfWeek <= 7) return labels[dayOfWeek - 1]
  return '—'
}

export function formatWeekday(dayOfWeek: number): string {
  const labels = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']
  if (dayOfWeek >= 0 && dayOfWeek <= 6) return labels[dayOfWeek]
  if (dayOfWeek >= 1 && dayOfWeek <= 7) return labels[dayOfWeek - 1]
  return `День ${dayOfWeek}`
}

export function formatSetLine(item: SetPrescription): string {
  const parts: string[] = [`Подход ${item.set_index}`]
  if (item.duration_seconds && item.duration_seconds > 0) {
    parts.push(`${item.duration_seconds} сек`)
  } else if (item.reps && item.reps > 0) {
    parts.push(`${item.reps} повт.`)
  }
  if (item.weight_kg != null && item.weight_kg > 0) parts.push(`${item.weight_kg} кг`)
  if (item.rest_seconds) parts.push(`отдых ${item.rest_seconds} сек`)
  return parts.join(' · ')
}

export function hasSetProgression(prescriptions: SetPrescription[]): boolean {
  if (prescriptions.length <= 1) return false
  const first = prescriptions[0]
  return prescriptions.some(
    (item) =>
      item.weight_kg !== first.weight_kg ||
      item.duration_seconds !== first.duration_seconds ||
      item.reps !== first.reps,
  )
}

export function formatExerciseSummary(exercise: PlanExercise): string {
  const parts: string[] = []
  if (exercise.sets && exercise.sets > 0) parts.push(`${exercise.sets}×`)
  if (exercise.duration_seconds && exercise.duration_seconds > 0) {
    parts.push(`${exercise.duration_seconds} сек`)
  } else if (exercise.reps && exercise.reps > 0) {
    parts.push(`${exercise.reps} повт.`)
  }
  if (exercise.weight_kg != null && exercise.weight_kg > 0) parts.push(`${exercise.weight_kg} кг`)
  return parts.length > 0 ? parts.join(' ') : 'По программе'
}
