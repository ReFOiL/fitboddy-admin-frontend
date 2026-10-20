const WEEKDAY_TITLE = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
const WEEKDAY_LOWER = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
const WEEKDAY_SHORT_JS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const MONTH_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

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

export function formatHeadingDate(date: Date): string {
  return `${WEEKDAY_TITLE[date.getDay()]}, ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`
}

export function formatLowerWeekday(date: Date): string {
  return WEEKDAY_LOWER[date.getDay()]
}

export function formatMonthDay(iso: string): string {
  const date = parseIsoDate(iso)
  if (!date) return iso
  return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`
}

export function formatJsWeekdayShort(date: Date): string {
  return WEEKDAY_SHORT_JS[date.getDay()]
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

export function missedWorkoutsLabel(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  const noun =
    mod10 === 1 && mod100 !== 11
      ? 'тренировку'
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? 'тренировки'
        : 'тренировок'
  return `Пропустил ${count} ${noun}`
}

export function weeksLabel(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'неделю'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'недели'
  return 'недель'
}
