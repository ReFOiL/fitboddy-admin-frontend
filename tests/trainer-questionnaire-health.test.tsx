import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

import { PlanStudio } from '../src/components/trainer/PlanStudio'
import { TRAINER_HEALTH_PRIVATE_MESSAGE } from '../src/lib/health-data-consent'

const profile = {
  full_name: 'Анна',
  age: 30,
  gender: 'female',
  goal: 'weight_loss',
  experience_level: 'beginner',
  workout_location: 'home',
  limitations: 'травма колена',
  medical_notes: 'астма',
  health_data_consent: false as boolean | undefined,
}

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({ user: { user_id: 'trainer-1', role: 'trainer' } }),
}))

vi.mock('../src/hooks/use-profile', () => ({
  useProfile: () => ({
    profileQuery: { data: profile, isLoading: false, isError: false, error: null },
    metaQuery: {
      data: {
        genders: [{ value: 'female', label: 'Женский' }],
        goals: [{ value: 'weight_loss', label: 'Снижение веса' }],
        levels: [{ value: 'beginner', label: 'Начинающий' }],
        workout_locations: [{ value: 'home', label: 'Дома' }],
      },
    },
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
}))

vi.mock('../src/hooks/use-manual-plan', () => ({
  useManualPlan: () => ({
    planQuery: { data: undefined, isLoading: false, isError: false, refetch: vi.fn() },
    isMissing: false,
    saveMutation: { isPending: false, mutate: vi.fn() },
    addDayMutation: { isPending: false },
    deleteDayMutation: { isPending: false },
    copyDayMutation: { isPending: false },
    copyWeekMutation: { isPending: false },
    changeWeekdayMutation: { isPending: false },
  }),
}))

vi.mock('../src/api', async () => {
  const actual = await vi.importActual<typeof import('../src/api')>('../src/api')
  return {
    ...actual,
    listTrainerExercises: vi.fn().mockResolvedValue([]),
  }
})

function renderQuestionnaire() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter([
    { path: '/', element: <PlanStudio clientUserId="client-1" initialScreen="questionnaire" /> },
  ])
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('trainer questionnaire health fields', () => {
  beforeEach(() => {
    profile.health_data_consent = false
    profile.limitations = 'травма колена'
    profile.medical_notes = 'астма'
  })

  it('не показывает текст о здоровье без согласия', () => {
    renderQuestionnaire()

    expect(screen.getByRole('heading', { name: 'Анкета' })).toBeInTheDocument()
    expect(screen.getByText('Анна')).toBeInTheDocument()
    expect(screen.queryByText('травма колена')).not.toBeInTheDocument()
    expect(screen.queryByText('астма')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(TRAINER_HEALTH_PRIVATE_MESSAGE)
  })

  it('показывает текст, если согласие записано', () => {
    profile.health_data_consent = true
    renderQuestionnaire()

    expect(screen.getByText('травма колена')).toBeInTheDocument()
    expect(screen.getByText('астма')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
