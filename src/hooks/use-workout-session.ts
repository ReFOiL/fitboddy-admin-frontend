import { useMemo, useState } from 'react'

import {
  clearActiveWorkoutDay,
  clearSessionChecks,
  clearWorkoutStart,
  loadActiveWorkoutDay,
  loadSessionChecks,
  markWorkoutStarted,
  saveActiveWorkoutDay,
  saveSessionChecks,
} from '../lib/plan-session'
import type { TodayWorkout } from '../types/plan'

type SessionDraft = {
  dayId: string
  ids: Set<string>
}

export function useWorkoutSession(workout: TodayWorkout | undefined) {
  const [draft, setDraft] = useState<SessionDraft | null>(null)
  const dayId = workout?.day_id
  // Ручной старт/сворачивание на этом экране. null — читаем флаг из sessionStorage,
  // чтобы смена вкладки не стирала начатую тренировку.
  const [trackedDayId, setTrackedDayId] = useState(dayId)
  const [manualActive, setManualActive] = useState<boolean | null>(null)
  if (dayId !== trackedDayId) {
    setTrackedDayId(dayId)
    setManualActive(null)
  }
  const storedActive = Boolean(dayId && loadActiveWorkoutDay() === dayId)
  const active = manualActive ?? storedActive

  const checkedLineIds = useMemo(() => {
    if (!dayId) return new Set<string>()
    if (draft?.dayId === dayId) return draft.ids
    return loadSessionChecks(dayId)
  }, [dayId, draft])

  const toggleChecked = (lineId: string) => {
    if (!workout || workout.is_completed) return
    const next = new Set(checkedLineIds)
    if (next.has(lineId)) next.delete(lineId)
    else next.add(lineId)
    saveSessionChecks(workout.day_id, next)
    setDraft({ dayId: workout.day_id, ids: next })
  }

  const finish = () => {
    if (dayId) {
      clearSessionChecks(dayId)
      clearWorkoutStart(dayId)
    }
    clearActiveWorkoutDay()
    setDraft(null)
    setManualActive(false)
  }

  const checkedCount = workout
    ? workout.exercises.filter((exercise) => checkedLineIds.has(exercise.line_id)).length
    : 0

  return {
    isActive: Boolean(active && workout && !workout.is_completed),
    start: () => {
      if (dayId) {
        markWorkoutStarted(dayId)
        saveActiveWorkoutDay(dayId)
      }
      setManualActive(true)
    },
    collapse: () => {
      clearActiveWorkoutDay()
      setManualActive(false)
    },
    finish,
    checkedLineIds,
    checkedCount,
    exerciseTotal: workout?.exercises.length ?? 0,
    toggleChecked,
  }
}
