import { pluralPhrase } from './plural'

const WEEKDAY_TITLE = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
const WEEKDAY_LOWER = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
const WEEKDAY_SHORT_JS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const WEEKDAY_TINY = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MONTH_ABBR = ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июня', 'июля', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.']
const MONTH_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

export function localTodayIso(now = new Date()): string {
  return toIsoDate(now)
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addIsoDays(iso: string, days: number): string {
  const date = parseIsoDate(iso)
  if (!date) return iso
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

function asCalendarDate(value: Date | string): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  return parseIsoDate(value)
}

/**
 * Одна форма даты на всё приложение.
 * long — «16 ноября», short — «пн, 16 нояб.».
 */
export function formatCalendarDate(value: Date | string, style: 'long' | 'short' = 'long'): string {
  const date = asCalendarDate(value)
  if (!date) return typeof value === 'string' ? value : ''
  const day = date.getDate()
  if (style === 'long') return `${day} ${MONTH_GENITIVE[date.getMonth()]}`
  return `${WEEKDAY_TINY[date.getDay()]}, ${day} ${MONTH_ABBR[date.getMonth()]}`
}

export function formatHeadingDate(date: Date): string {
  return `${WEEKDAY_TITLE[date.getDay()]}, ${formatCalendarDate(date, 'long')}`
}

export function formatLowerWeekday(date: Date): string {
  return WEEKDAY_LOWER[date.getDay()]
}

export function formatMonthDay(iso: string): string {
  return formatCalendarDate(iso, 'long')
}

export function formatJsWeekdayShort(date: Date): string {
  return WEEKDAY_SHORT_JS[date.getDay()]
}

/** «Тренировка · пн, 16 нояб.» — одна строка, без полного названия дня. */
export function formatWorkoutSessionTitle(scheduledFor: string): string {
  const date = parseIsoDate(scheduledFor)
  if (!date) return 'Тренировка'
  return `Тренировка · ${formatCalendarDate(date, 'short')}`
}

export function calendarWeek(today: Date): Date[] {
  const start = new Date(today)
  const day = start.getDay()
  const mondayShift = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + mondayShift)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

export function messageCountLabel(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} сообщение`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} сообщения`
  return `${count} сообщений`
}

/** Без рода: «4 пропущенные тренировки», а не «Пропустил 4 тренировки». */
export function missedWorkoutsLabel(count: number): string {
  return pluralPhrase(count, ['пропущенная тренировка', 'пропущенные тренировки', 'пропущенных тренировок'])
}

export function formatWorkoutClock(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function formatWorkoutDuration(startedAt?: string | null, finishedAt?: string | null): string | null {
  if (!startedAt || !finishedAt) return null
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  const minutes = Math.round(ms / 60000)
  if (minutes < 1) return 'меньше минуты'
  if (minutes < 60) return `${minutes} мин`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`
}

/** Разница календарных дней: `to − from`. Отрицательная, если `to` раньше. */
export function isoDayDiff(fromIso: string, toIso: string): number | null {
  const from = parseIsoDate(fromIso)
  const to = parseIsoDate(toIso)
  if (!from || !to) return null
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

/** «16 нояб.» или «16 ноября» — без дня недели. */
export function formatDayMonth(iso: string, style: 'long' | 'short' = 'short'): string {
  const date = parseIsoDate(iso)
  if (!date) return iso
  const day = date.getDate()
  const month = style === 'long' ? MONTH_GENITIVE[date.getMonth()] : MONTH_ABBR[date.getMonth()]
  return `${day} ${month}`
}

/** Понедельник и воскресенье календарной недели, в которую попадает дата. */
export function calendarWeekBounds(iso: string): { start: string; end: string } | null {
  const date = parseIsoDate(iso)
  if (!date) return null
  const jsDay = date.getDay()
  const mondayShift = jsDay === 0 ? -6 : 1 - jsDay
  const start = new Date(date)
  start.setDate(date.getDate() + mondayShift)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start: toIsoDate(start), end: toIsoDate(end) }
}

/** «16–22 ноября» или «30 ноября — 6 декабря». */
export function formatWeekSpan(startIso: string, endIso: string): string {
  const start = parseIsoDate(startIso)
  const end = parseIsoDate(endIso)
  if (!start || !end) return ''
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${MONTH_GENITIVE[end.getMonth()]}`
  }
  return `${formatDayMonth(startIso, 'long')} — ${formatDayMonth(endIso, 'long')}`
}

export function weeksLabel(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'неделю'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'недели'
  return 'недель'
}
