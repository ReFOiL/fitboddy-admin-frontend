import { useEffect, useId, useRef, useState } from 'react'

import {
  formatPlanStartSubtitle,
  nextMondayOptionRepeatsWorkout,
  nextWeekMonday,
  nextWorkoutDate,
  planStartChoiceForSlots,
  type PlanStartChoice,
} from '../../lib/plan-start'
import type { PlanStartMode } from '../../types/plan'
import { Input } from '../ui/input'
import { cn } from '../../lib/utils'

type PlanStartCardProps = {
  choice: PlanStartChoice
  todayIso: string
  dayOfWeeks: readonly number[]
  onChange: (next: PlanStartChoice) => void
}

export function PlanStartCard({ choice, todayIso, dayOfWeeks, onChange }: PlanStartCardProps) {
  const headingId = useId()
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [pickerTick, setPickerTick] = useState(0)
  const nextWorkout = nextWorkoutDate(dayOfWeeks, todayIso)
  const nextMonday = nextWeekMonday(todayIso)
  const mondayRepeatsWorkout = nextMondayOptionRepeatsWorkout(dayOfWeeks, todayIso)
  const shownChoice = planStartChoiceForSlots(choice, dayOfWeeks, todayIso)
  const customDate = shownChoice.mode === 'date' ? shownChoice.date : null

  useEffect(() => {
    if (choice.mode === 'next_monday' && mondayRepeatsWorkout) {
      onChange({ mode: 'next_workout' })
    }
  }, [mondayRepeatsWorkout, choice.mode, onChange])

  useEffect(() => {
    if (choice.mode !== 'date' || pickerTick === 0) return
    const input = dateInputRef.current
    if (!input) return
    input.focus()
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker()
      } catch {
        // showPicker needs a user gesture in some browsers; the field stays focused.
      }
    }
  }, [choice.mode, pickerTick])

  const selectMode = (mode: PlanStartMode) => {
    switch (mode) {
      case 'next_workout':
        onChange({ mode: 'next_workout' })
        return
      case 'next_monday':
        onChange({ mode: 'next_monday' })
        return
      case 'date':
        onChange(shownChoice.mode === 'date' ? shownChoice : { mode: 'date', date: null })
        setPickerTick((tick) => tick + 1)
        return
      default: {
        const unreachable: never = mode
        return unreachable
      }
    }
  }

  const nextWorkoutOption = {
    mode: 'next_workout' as const,
    label: 'С ближайшей тренировки',
    subtitle: nextWorkout ? formatPlanStartSubtitle(nextWorkout) : 'Дни ещё не выбраны',
  }
  const nextMondayOption = {
    mode: 'next_monday' as const,
    label: 'С понедельника следующей недели',
    subtitle: nextMonday ? formatPlanStartSubtitle(nextMonday) : null,
  }
  const dateOption = {
    mode: 'date' as const,
    label: 'С даты…',
    subtitle: customDate ? formatPlanStartSubtitle(customDate) : null,
  }
  const options = mondayRepeatsWorkout
    ? [nextWorkoutOption, dateOption]
    : [nextWorkoutOption, nextMondayOption, dateOption]

  return (
    <section aria-labelledby={headingId} className="mt-4 rounded-2xl border border-border bg-card p-4">
      <h2 id={headingId} className="text-[17px] font-semibold">
        Когда начать
      </h2>
      <div role="radiogroup" aria-labelledby={headingId} className="mt-3 grid gap-2">
        {options.map((option) => {
          const selected = shownChoice.mode === option.mode
          return (
            <button
              key={option.mode}
              type="button"
              role="radio"
              aria-checked={selected}
              className={cn(
                'rounded-2xl border px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                selected ? 'border-primary bg-card' : 'border-transparent bg-secondary',
              )}
              onClick={() => selectMode(option.mode)}
            >
              <span className="block text-[17px] font-semibold">{option.label}</span>
              {option.subtitle ? (
                <span className="mt-0.5 block text-[15px] text-secondary-foreground">{option.subtitle}</span>
              ) : null}
            </button>
          )
        })}
      </div>
      {shownChoice.mode === 'date' ? (
        <label className="mt-3 grid gap-2 text-[15px] font-semibold" htmlFor="plan-start-date">
          Дата старта
          <Input
            ref={dateInputRef}
            id="plan-start-date"
            type="date"
            value={shownChoice.date ?? ''}
            onChange={(event) => onChange({ mode: 'date', date: event.target.value || null })}
          />
        </label>
      ) : null}
    </section>
  )
}
