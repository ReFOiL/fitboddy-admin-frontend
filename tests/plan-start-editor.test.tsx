import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

import {
  getTrainerClientPlan,
  listTrainerExercises,
  patchPlanDayTime,
  replacePlanDaySlots,
  setPlanStart,
} from '../src/api'
import { PlanStartCard } from '../src/components/trainer/PlanStartCard'
import { PlanStudio } from '../src/components/trainer/PlanStudio'
import { addIsoDays, formatMonthDay, localTodayIso } from '../src/lib/dates'
import { formatPlanStartSubtitle, nextWeekMonday, nextWorkoutDate, type PlanStartChoice } from '../src/lib/plan-start'
import type { PlanDay, PlanExercise, TrainingPlan } from '../src/types/plan'

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({ user: { user_id: 'trainer-1', role: 'trainer' } }),
}))

vi.mock('../src/hooks/use-profile', () => ({
  useProfile: () => ({
    profileQuery: { data: undefined, isLoading: false, isError: false, error: null },
    metaQuery: { data: undefined },
  }),
}))

vi.mock('../src/hooks/use-relations', () => ({
  useTrainerRelations: () => ({
    trainerClientsQuery: { data: [{ client_user_id: 'client-1', client_display_name: 'Анна' }] },
    leaveRelationMutation: { mutate: vi.fn(), isPending: false },
  }),
}))

vi.mock('../src/hooks/use-plans', () => ({
  usePlans: () => ({
    activePlanQuery: { data: undefined, isLoading: false },
    generatePlanMutation: { mutate: vi.fn(), isPending: false },
  }),
  useClientLoads: () => ({
    loadsQuery: { data: [] },
    upsertLoadMutation: { mutate: vi.fn(), isPending: false },
  }),
}))

vi.mock('../src/api', async () => {
  const actual = await vi.importActual<typeof import('../src/api')>('../src/api')
  return {
    ...actual,
    getTrainerClientPlan: vi.fn(),
    listTrainerExercises: vi.fn().mockResolvedValue([]),
    setPlanStart: vi.fn(),
    replacePlanDaySlots: vi.fn(),
    patchPlanDayTime: vi.fn(),
  }
})

function exercise(name: string): PlanExercise {
  return {
    line_id: name,
    exercise_id: name,
    exercise_name: name,
    category: 'upper',
    is_cardio: false,
    sort_order: 1,
    sets: 3,
    reps: 8,
    duration_seconds: null,
    rest_seconds: 60,
    weight_kg: 40,
    set_prescriptions: [],
  }
}

function day(partial: Pick<PlanDay, 'day_id' | 'day_index' | 'day_of_week' | 'scheduled_for'> & { exercises?: PlanExercise[] }): PlanDay {
  return {
    week: 1,
    volume_multiplier: 1,
    is_completed: false,
    completed_at: null,
    exercises: partial.exercises ?? [],
    ...partial,
  }
}

function buildPlan(today: string): TrainingPlan {
  return {
    plan_id: 'plan-1',
    source: 'trainer',
    trainer_user_id: 'trainer-1',
    user_id: 'client-1',
    status: 'active',
    goal: 'maintenance',
    level: 'intermediate',
    workouts_per_week: 3,
    start_date: addIsoDays(today, -3),
    end_date: addIsoDays(today, 14),
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-20T00:00:00Z',
    days: [
      day({ day_id: 'lead-in', day_index: 1, day_of_week: 0, scheduled_for: addIsoDays(today, -4) }),
      day({
        day_id: 'missed',
        day_index: 2,
        day_of_week: 2,
        scheduled_for: addIsoDays(today, -2),
        exercises: [exercise('Жим')],
      }),
      day({
        day_id: 'later',
        day_index: 3,
        day_of_week: 3,
        scheduled_for: addIsoDays(today, 6),
        exercises: [exercise('Тяга')],
      }),
      day({ day_id: 'saturday', day_index: 4, day_of_week: 5, scheduled_for: addIsoDays(today, 8) }),
    ],
  }
}

function renderStudio(plan: TrainingPlan) {
  vi.mocked(getTrainerClientPlan).mockResolvedValue(plan)
  vi.mocked(listTrainerExercises).mockResolvedValue([])
  vi.mocked(setPlanStart).mockResolvedValue(plan)
  vi.mocked(replacePlanDaySlots).mockResolvedValue(plan.days[1])
  vi.mocked(patchPlanDayTime).mockResolvedValue(plan.days[1])
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter([{ path: '/', element: <PlanStudio clientUserId="client-1" initialScreen="plan" /> }])
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function StartHarness({
  todayIso,
  initialDays,
  initialChoice,
}: {
  todayIso: string
  initialDays: number[]
  initialChoice: PlanStartChoice
}) {
  const [choice, setChoice] = useState(initialChoice)
  const [dayOfWeeks, setDayOfWeeks] = useState(initialDays)
  return (
    <>
      <div data-testid="start-mode">{choice.mode}</div>
      <PlanStartCard choice={choice} todayIso={todayIso} dayOfWeeks={dayOfWeeks} onChange={setChoice} />
      <button type="button" onClick={() => setDayOfWeeks([0])}>
        Оставить понедельник
      </button>
    </>
  )
}

describe('Когда начать', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('по умолчанию ближайшая тренировка, смена варианта попадает в сохранение', async () => {
    const today = localTodayIso()
    const plan = buildPlan(today)
    const weekdays = plan.days.map((item) => item.day_of_week)
    renderStudio(plan)

    const nearest = await screen.findByRole('radio', { name: /С ближайшей тренировки/ })
    expect(nearest).toBeChecked()
    const nearestDate = nextWorkoutDate(weekdays, today)
    const monday = nextWeekMonday(today)
    expect(nearestDate).toBeTruthy()
    expect(nearest).toHaveTextContent(formatPlanStartSubtitle(nearestDate ?? ''))
    expect(screen.getByRole('button', { name: 'Сохранить план' })).toBeDisabled()
    if (nearestDate && monday && nearestDate === monday) {
      expect(screen.queryByRole('radio', { name: /С понедельника следующей недели/ })).not.toBeInTheDocument()
      return
    }
    expect(formatPlanStartSubtitle(nearestDate ?? '')).not.toBe(formatPlanStartSubtitle(monday ?? ''))
    expect(screen.queryByRole('button', { name: 'Пн', exact: true })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ср', exact: true })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: /С понедельника следующей недели/ }))
    expect(monday).toBeTruthy()
    expect(screen.getByRole('radio', { name: /С понедельника следующей недели/ })).toHaveTextContent(
      formatPlanStartSubtitle(monday ?? ''),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить план' }))

    await waitFor(() => {
      expect(setPlanStart).toHaveBeenCalledWith('client-1', 'trainer-1', {
        start_mode: 'next_monday',
        start_date: monday,
      })
    })
    expect(replacePlanDaySlots).not.toHaveBeenCalled()
  })

  it('дата из календаря уходит в payload, пустая дата сохранение не открывает', async () => {
    const today = localTodayIso()
    const plan = buildPlan(today)
    renderStudio(plan)

    await screen.findByRole('radio', { name: /С ближайшей тренировки/ })
    fireEvent.change(screen.getByLabelText('Время'), { target: { value: '18:00' } })
    expect(screen.getByRole('button', { name: 'Сохранить план' })).toBeEnabled()

    fireEvent.click(screen.getByRole('radio', { name: /С даты/ }))
    expect(screen.getByLabelText('Дата старта')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Сохранить план' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Дата старта'), { target: { value: '2026-11-03' } })
    expect(screen.getByRole('radio', { name: /С даты/ })).toHaveTextContent('Вт, 3 ноя')
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить план' }))

    await waitFor(() => {
      expect(setPlanStart).toHaveBeenCalledWith('client-1', 'trainer-1', {
        start_mode: 'date',
        start_date: '2026-11-03',
      })
    })
    expect(patchPlanDayTime).toHaveBeenCalledWith('client-1', 'trainer-1', 2, '18:00')
  })

  it('пустой день до старта в первой неделе не показан как пропуск', async () => {
    const today = localTodayIso()
    const plan = buildPlan(today)
    renderStudio(plan)

    await screen.findByRole('heading', { name: 'Анна' })
    fireEvent.click(screen.getByRole('button', { name: 'Прогресс' }))

    expect(await screen.findByText(/пропущена/)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(formatMonthDay(addIsoDays(today, -2))))).toBeInTheDocument()
    expect(screen.queryByText(new RegExp(formatMonthDay(addIsoDays(today, -4))))).not.toBeInTheDocument()
    expect(screen.getAllByText('×')).toHaveLength(1)
  })

  it('прячет понедельник следующей недели, когда подпись совпала бы с ближайшей', async () => {
    const slots = [0, 2, 4]
    render(<StartHarness todayIso="2026-10-23" initialDays={slots} initialChoice={{ mode: 'next_workout' }} />)

    const nearest = screen.getByRole('radio', { name: /С ближайшей тренировки/ })
    const monday = screen.getByRole('radio', { name: /С понедельника следующей недели/ })
    expect(nearest).toHaveTextContent('Пт, 23 окт')
    expect(monday).toHaveTextContent('Пн, 26 окт')
    expect(nearest).toBeChecked()

    fireEvent.click(monday)
    expect(monday).toBeChecked()
    expect(screen.getByTestId('start-mode')).toHaveTextContent('next_monday')

    fireEvent.click(screen.getByRole('button', { name: 'Оставить понедельник' }))

    expect(screen.queryByRole('radio', { name: /С понедельника следующей недели/ })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /С ближайшей тренировки/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /С ближайшей тренировки/ })).toHaveTextContent('Пн, 26 окт')
    await waitFor(() => {
      expect(screen.getByTestId('start-mode')).toHaveTextContent('next_workout')
    })
  })

  it('в понедельник с понедельником в плане подписи не совпадают', () => {
    render(<StartHarness todayIso="2026-10-19" initialDays={[0, 2, 4]} initialChoice={{ mode: 'next_workout' }} />)

    expect(screen.getByRole('radio', { name: /С ближайшей тренировки/ })).toHaveTextContent('Пн, 19 окт')
    expect(screen.getByRole('radio', { name: /С понедельника следующей недели/ })).toHaveTextContent('Пн, 26 окт')
  })

  it('сохранённый next_monday в субботу становится ближайшей тренировкой', async () => {
    render(<StartHarness todayIso="2026-10-24" initialDays={[0, 2, 4]} initialChoice={{ mode: 'next_monday' }} />)

    expect(screen.queryByRole('radio', { name: /С понедельника следующей недели/ })).not.toBeInTheDocument()
    const nearest = screen.getByRole('radio', { name: /С ближайшей тренировки/ })
    expect(nearest).toBeChecked()
    expect(nearest).toHaveTextContent('Пн, 26 окт')
    await waitFor(() => {
      expect(screen.getByTestId('start-mode')).toHaveTextContent('next_workout')
    })
  })
})
