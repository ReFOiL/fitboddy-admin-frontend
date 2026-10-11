import { planEditorPaths } from '../src/api/plan-editor'
import {
  createEmptyCycle,
  daySlotsPayload,
  dirtyDayIndexes,
  editorDaysEqual,
  inferSlotHold,
  moveSlot,
  slotDosageError,
  slotFromCatalog,
  slotFromPlanExercise,
  sortCatalogForPicker,
  toPlanSlotWrite,
  type EditorDay,
  type EditorSlot,
} from '../src/lib/plan-editor-draft'
import type { TrainerExercise } from '../src/types/exercise'
import type { PlanExercise } from '../src/types/plan'

function slot(partial: Partial<EditorSlot> & Pick<EditorSlot, 'key' | 'exerciseName'>): EditorSlot {
  return {
    lineId: partial.lineId ?? null,
    exerciseId: partial.exerciseId ?? partial.key,
    category: 'upper',
    isCardio: false,
    isHold: false,
    sets: 3,
    reps: 10,
    durationSeconds: null,
    restSeconds: 60,
    weightKg: null,
    ...partial,
  }
}

function day(dayIndex: number, slots: EditorSlot[]): EditorDay {
  return {
    dayId: `day-${dayIndex}`,
    dayIndex,
    week: 1,
    dayOfWeek: 0,
    scheduledFor: '2026-10-12',
    isCompleted: false,
    slots,
  }
}

const exercise = {
  line_id: 'line-1',
  exercise_id: 'row-1',
  exercise_name: 'Планка',
  category: 'core',
  is_cardio: false,
  sort_order: 1,
  sets: 3,
  reps: null,
  duration_seconds: 30,
  rest_seconds: 45,
  weight_kg: null,
  set_prescriptions: [],
} satisfies PlanExercise

describe('plan editor draft', () => {
  it('treats duration without reps as a hold and writes duration only', () => {
    expect(inferSlotHold(exercise)).toBe(true)
    const hold = slotFromPlanExercise(exercise)
    expect(toPlanSlotWrite(hold, 1)).toEqual({
      line_id: 'line-1',
      exercise_id: 'row-1',
      sets: 3,
      reps: null,
      duration_seconds: 30,
      rest_seconds: 45,
      weight_kg: null,
      sort_order: 1,
    })
  })

  it('moves a slot up and down without dropping exercises', () => {
    const slots = [slot({ key: 'a', exerciseName: 'А' }), slot({ key: 'b', exerciseName: 'Б' })]
    const down = moveSlot(slots, 0, 1)
    expect(down.map((item) => item.key)).toEqual(['b', 'a'])
    expect(moveSlot(down, 1, -1).map((item) => item.key)).toEqual(['a', 'b'])
    expect(moveSlot(slots, 0, -1)).toBe(slots)
  })

  it('marks only changed cycle days dirty and numbers slots from 1', () => {
    const baseline = [day(1, [slot({ key: 'a', lineId: 'line-a', exerciseName: 'А' })])]
    const draft = [
      day(1, [slot({ key: 'a', lineId: 'line-a', exerciseName: 'А', sets: 4 })]),
      day(2, [slot({ key: 'b', exerciseName: 'Б' })]),
    ]
    expect(editorDaysEqual(baseline, draft)).toBe(false)
    expect(dirtyDayIndexes(baseline, draft)).toEqual([1, 2])
    expect(daySlotsPayload(draft[0])[0]?.sort_order).toBe(1)
    expect(daySlotsPayload(draft[0])[0]?.sets).toBe(4)
  })

  it('builds an empty cycle of 1 to 7 days', () => {
    expect(createEmptyCycle(3)).toHaveLength(3)
    expect(createEmptyCycle(0)).toHaveLength(1)
    expect(createEmptyCycle(9)).toHaveLength(7)
    expect(createEmptyCycle(2)[1]?.scheduledFor).toBe('')
  })

  it('rejects dosage outside the catalog bounds', () => {
    expect(slotDosageError(slot({ key: 'a', exerciseName: 'Жим', sets: 0 }))).toMatch(/подходы/)
    expect(slotDosageError(slot({ key: 'a', exerciseName: 'Жим', reps: 101 }))).toMatch(/повторы/)
    expect(
      slotDosageError(slot({ key: 'a', exerciseName: 'Планка', isHold: true, reps: null, durationSeconds: 3 })),
    ).toMatch(/удержание/)
    expect(slotDosageError(slot({ key: 'a', exerciseName: 'Жим' }))).toBeNull()
  })

  it('sorts the trainer catalog before other exercises', () => {
    const own = { exercise_name: 'Ягодичный мост', trainer_user_id: 'trainer-1' } as TrainerExercise
    const other = { exercise_name: 'Альпинист', trainer_user_id: 'platform' } as TrainerExercise
    expect(sortCatalogForPicker([other, own], 'trainer-1').map((item) => item.exercise_name)).toEqual([
      'Ягодичный мост',
      'Альпинист',
    ])
  })

  it('copies catalog defaults into a new slot', () => {
    const created = slotFromCatalog({
      row_id: 'row-9',
      trainer_user_id: 'trainer-1',
      exercise_name: 'Выпады',
      description: null,
      equipment: 'none',
      is_cardio: false,
      is_hold: false,
      difficulty: 2,
      workout_category: 'lower',
      default_sets: 4,
      default_reps: 8,
      default_duration_seconds: null,
      default_rest_seconds: 90,
      default_weight_kg: 12,
      load_scheme: 'flat',
      scheme_steps: [],
      is_active: true,
      video_url: null,
      start_image_url: null,
      end_image_url: null,
      created_at: '',
      updated_at: '',
      primary_muscles: [],
      secondary_muscles: [],
    })
    expect(created.lineId).toBeNull()
    expect(created.exerciseId).toBe('row-9')
    expect(created.sets).toBe(4)
    expect(created.reps).toBe(8)
    expect(created.weightKg).toBe(12)
  })
})

describe('plan editor paths', () => {
  it('keeps trainer manual routes in one place', () => {
    expect(planEditorPaths.replaceDaySlots('client', 'trainer', 2)).toBe(
      '/api/v1/plans/clients/client/trainers/trainer/days/2/slots',
    )
    expect(planEditorPaths.addSlot('client', 'trainer', 2)).toBe(
      '/api/v1/plans/clients/client/trainers/trainer/days/2/slots',
    )
    expect(planEditorPaths.updateSlot('client', 'trainer', 2, 'line/1')).toBe(
      '/api/v1/plans/clients/client/trainers/trainer/days/2/slots/line%2F1',
    )
    expect(planEditorPaths.deleteSlot('client', 'trainer', 2, 'line-1')).toBe(
      '/api/v1/plans/clients/client/trainers/trainer/days/2/slots/line-1',
    )
    expect(planEditorPaths.reorderSlots('client', 'trainer', 2)).toBe(
      '/api/v1/plans/clients/client/trainers/trainer/days/2/slots/order',
    )
    expect(planEditorPaths.createManualPlan('client', 'trainer')).toBe(
      '/api/v1/plans/clients/client/trainers/trainer/manual',
    )
  })
})
