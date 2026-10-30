import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

import { changePlanDayWeekday, getTrainerClientPlan, listTrainerExercises } from '../src/api'
import { PlanStudio } from '../src/components/trainer/PlanStudio'
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
    changePlanDayWeekday: vi.fn(),
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

function day(partial: Pick<PlanDay, 'day_id' | 'day_index' | 'day_of_week'> & { exercises: PlanExercise[] }): PlanDay {
  return {
    week: 1,
    scheduled_for: '2026-11-02',
    volume_multiplier: 1,
    is_completed: false,
    completed_at: null,
    exercises: partial.exercises,
    ...partial,
  }
}

function buildPlan(): TrainingPlan {
  return {
    plan_id: 'plan-1',
    source: 'trainer',
    trainer_user_id: 'trainer-1',
    user_id: 'client-1',
    status: 'active',
    goal: 'maintenance',
    level: 'intermediate',
    workouts_per_week: 2,
    start_date: '2026-11-02',
    end_date: '2026-11-15',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-20T00:00:00Z',
    days: [
      day({ day_id: 'monday', day_index: 1, day_of_week: 0, exercises: [exercise('Жим')] }),
      day({ day_id: 'wednesday', day_index: 2, day_of_week: 2, exercises: [exercise('Приседания')] }),
    ],
  }
}

function renderStudio(readPlan: () => TrainingPlan) {
  vi.mocked(getTrainerClientPlan).mockImplementation(async () => readPlan())
  vi.mocked(listTrainerExercises).mockResolvedValue([])
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

async function openWednesdayMenu() {
  const wednesday = await screen.findByRole('button', { name: 'Ср', exact: true })
  fireEvent.click(wednesday)
  fireEvent.click(screen.getByRole('button', { name: 'Ср', exact: true }))
  expect(await screen.findByRole('dialog', { name: 'День недели' })).toBeInTheDocument()
}

describe('Смена дня недели с чипа', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('свободный день меняет day_of_week и оставляет day_index', async () => {
    const holder = { plan: buildPlan() }
    vi.mocked(changePlanDayWeekday).mockImplementation(async (_client, _trainer, dayIndex, payload) => {
      const plan = {
        ...holder.plan,
        updated_at: '2026-10-21T00:00:00Z',
        days: holder.plan.days.map((item) =>
          item.day_index === dayIndex ? { ...item, day_of_week: payload.day_of_week } : item,
        ),
      }
      holder.plan = plan
      return {
        outcome: 'set' as const,
        day_index: dayIndex,
        day_of_week: payload.day_of_week,
        swapped_day_index: null,
        plan,
      }
    })
    renderStudio(() => holder.plan)

    await openWednesdayMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Среда, выбран' }))
    expect(changePlanDayWeekday).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: 'День недели' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ср', exact: true }))
    expect(screen.getByRole('button', { name: 'Понедельник, занят' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Воскресенье, свободен' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Четверг, свободен' }))

    await waitFor(() => {
      expect(changePlanDayWeekday).toHaveBeenCalledWith('client-1', 'trainer-1', 2, { day_of_week: 3 })
    })
    const response = await vi.mocked(changePlanDayWeekday).mock.results[0]?.value
    expect(response).toMatchObject({ outcome: 'set', day_index: 2, day_of_week: 3, swapped_day_index: null })
    expect(holder.plan.days.find((item) => item.day_index === 2)?.day_of_week).toBe(3)
    expect(holder.plan.days.map((item) => item.day_index)).toEqual([1, 2])
    expect(holder.plan.days.find((item) => item.day_index === 2)?.exercises[0]?.exercise_name).toBe('Приседания')

    expect(await screen.findByRole('button', { name: 'Чт', exact: true })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ср', exact: true })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Приседания/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Жим/ })).not.toBeInTheDocument()
  })

  it('занятый день открывает обмен и не считает это ошибкой', async () => {
    const holder = { plan: buildPlan() }
    vi.mocked(changePlanDayWeekday).mockImplementation(async (_client, _trainer, dayIndex, payload) => {
      const source = holder.plan.days.find((item) => item.day_index === dayIndex)
      const plan = {
        ...holder.plan,
        updated_at: '2026-10-22T00:00:00Z',
        days: holder.plan.days.map((item) => {
          if (!source) return item
          if (item.day_index === dayIndex) return { ...item, day_of_week: payload.day_of_week }
          if (item.day_of_week === payload.day_of_week && item.week === source.week) {
            return { ...item, day_of_week: source.day_of_week }
          }
          return item
        }),
      }
      holder.plan = plan
      const swapped = plan.days.find((item) => item.day_index !== dayIndex && item.day_of_week === source?.day_of_week)
      return {
        outcome: 'swap' as const,
        day_index: dayIndex,
        day_of_week: payload.day_of_week,
        swapped_day_index: swapped?.day_index ?? null,
        plan,
      }
    })
    renderStudio(() => holder.plan)

    await openWednesdayMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Понедельник, занят' }))

    const dialog = await screen.findByRole('dialog', { name: 'Поменять местами' })
    expect(dialog).toHaveTextContent('Пн ↔ Ср')
    expect(changePlanDayWeekday).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(screen.queryByRole('dialog', { name: 'Поменять местами' })).not.toBeInTheDocument()
    expect(changePlanDayWeekday).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Ср', exact: true }))
    fireEvent.click(await screen.findByRole('button', { name: 'Понедельник, занят' }))
    fireEvent.click(screen.getByRole('button', { name: 'Поменять' }))

    await waitFor(() => {
      expect(changePlanDayWeekday).toHaveBeenCalledWith('client-1', 'trainer-1', 2, { day_of_week: 0 })
    })
    const response = await vi.mocked(changePlanDayWeekday).mock.results[0]?.value
    expect(response).toMatchObject({ outcome: 'swap', day_index: 2, day_of_week: 0, swapped_day_index: 1 })
    expect(holder.plan.days.find((item) => item.day_index === 2)?.day_of_week).toBe(0)
    expect(holder.plan.days.find((item) => item.day_index === 1)?.day_of_week).toBe(2)
    expect(holder.plan.days.map((item) => item.day_index)).toEqual([1, 2])
    expect(holder.plan.days.find((item) => item.day_index === 2)?.exercises[0]?.exercise_name).toBe('Приседания')
    expect(holder.plan.days.find((item) => item.day_index === 1)?.exercises[0]?.exercise_name).toBe('Жим')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Пн', exact: true })).toHaveAttribute('aria-expanded', 'false')
    })
    expect(screen.getByRole('button', { name: /Приседания/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Жим/ })).not.toBeInTheDocument()
  })
})
