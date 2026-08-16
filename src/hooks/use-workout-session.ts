import { useMemo, useState } from 'react'

import { clearSessionChecks, loadSessionChecks, saveSessionChecks } from '../lib/plan-session'
import type { TodayWorkout } from '../types/plan'

type SessionDraft = {
  dayId: string
  ids: Set<string>
}

export function useWorkoutSession(workout: TodayWorkout | undefined) {
  const [isActive, setIsActive] = useState(false)
  const [draft, setDraft] = useState<SessionDraft | null>(null)
  const dayId = workout?.day_id

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
    if (dayId) clearSessionChecks(dayId)
    setDraft(null)
    setIsActive(false)
  }

  const checkedCount = workout
    ? workout.exercises.filter((exercise) => checkedLineIds.has(exercise.line_id)).length
    : 0

  return {
    isActive: Boolean(isActive && workout && !workout.is_completed),
    start: () => setIsActive(true),
    collapse: () => setIsActive(false),
    finish,
    checkedLineIds,
    checkedCount,
    exerciseTotal: workout?.exercises.length ?? 0,
    toggleChecked,
  }
}
