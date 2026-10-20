import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import axios from 'axios'
import { MemoryRouter } from 'react-router-dom'

import { listTrainerExercises } from '../src/api/exercises'
import { TrainerClientProfilePage } from '../src/pages/TrainerClientProfile'

const mocks = vi.hoisted(() => ({
  profileQuery: {
    data: undefined as Record<string, unknown> | undefined,
    error: null as unknown,
    isFetching: false,
    isLoading: false,
  },
  activePlanQuery: {
    data: undefined as Record<string, unknown> | undefined,
    error: null as unknown,
    isLoading: false,
    isError: false,
  },
}))

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({ user: { user_id: 'trainer-1', role: 'trainer' } }),
}))

vi.mock('../src/hooks', () => ({
  useTrainerRelations: () => ({
    trainerClientsQuery: {
      data: [
        {
          relation_id: 'rel-1',
          trainer_user_id: 'trainer-1',
          client_user_id: 'client-1',
          client_display_name: 'Анна',
          client_login: 'anna',
          status: 'active',
          source: 'direct',
          created_at: '2026-01-15T00:00:00.000Z',
          updated_at: '2026-01-15T00:00:00.000Z',
        },
      ],
      isLoading: false,
    },
  }),
}))

vi.mock('../src/hooks/use-profile', () => ({
  useProfile: () => ({
    profileQuery: mocks.profileQuery,
    metaQuery: { data: undefined, error: null },
  }),
}))

vi.mock('../src/hooks/use-plans', () => ({
  usePlans: () => ({
    activePlanQuery: mocks.activePlanQuery,
    generatePlanMutation: { isPending: false, mutate: vi.fn() },
  }),
  useClientLoads: () => ({
    loadsQuery: { data: [], isLoading: false, isError: false },
    upsertLoadMutation: { isPending: false, mutate: vi.fn() },
  }),
}))

vi.mock('../src/api/exercises', () => ({
  listTrainerExercises: vi.fn(async () => []),
}))

function httpError(status: number) {
  return new axios.AxiosError('fail', String(status), undefined, undefined, {
    status,
    statusText: 'Error',
    headers: {},
    config: { headers: new axios.AxiosHeaders() },
    data: {},
  })
}

function renderProfile() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/clients/profile?clientUserId=client-1']}>
        <TrainerClientProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TrainerClientProfile plan composition', () => {
  beforeEach(() => {
    mocks.profileQuery.data = undefined
    mocks.profileQuery.error = null
    mocks.profileQuery.isFetching = false
    mocks.profileQuery.isLoading = false
    mocks.activePlanQuery.data = undefined
    mocks.activePlanQuery.error = httpError(404)
    mocks.activePlanQuery.isLoading = false
    mocks.activePlanQuery.isError = true
    vi.mocked(listTrainerExercises).mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('показывает, почему нельзя составить план, если анкеты нет', () => {
    mocks.profileQuery.error = httpError(404)

    renderProfile()

    expect(screen.getByRole('button', { name: 'Составить план' })).toBeDisabled()
    expect(screen.getByText(/Анкета клиента не заполнена/)).toBeInTheDocument()
    expect(
      screen.getByText(
        'План собирается из вашего каталога и правил планов. После изменений в каталоге или правилах его нужно пересобрать.',
      ),
    ).toBeInTheDocument()
  })

  it('называет действие «Составить план», когда анкета готова и плана нет', () => {
    mocks.profileQuery.data = {
      user_id: 'client-1',
      age: 28,
      gender: 'female',
      goal: 'maintenance',
      experience_level: 'beginner',
      workout_location: 'gym',
      full_name: 'Анна',
    }

    renderProfile()

    expect(screen.getByRole('button', { name: 'Составить план' })).toBeEnabled()
    expect(screen.queryByText(/Анкета клиента неполная/)).not.toBeInTheDocument()
  })

  it('оставляет пересборку и объясняет, что план берётся из каталога', () => {
    mocks.profileQuery.data = {
      user_id: 'client-1',
      age: 28,
      gender: 'female',
      goal: 'maintenance',
      experience_level: 'beginner',
      workout_location: 'gym',
      full_name: 'Анна',
    }
    mocks.activePlanQuery.data = {
      source: 'trainer',
      trainer_user_id: 'trainer-1',
      start_date: '2026-01-01',
      end_date: '2026-02-01',
      workouts_per_week: 3,
      days: [],
    }
    mocks.activePlanQuery.error = null
    mocks.activePlanQuery.isError = false

    renderProfile()

    expect(screen.getByRole('button', { name: 'Пересобрать план' })).toBeEnabled()
    expect(screen.getByText(/После изменений в каталоге или правилах его нужно пересобрать/)).toBeInTheDocument()
    expect(document.getElementById('plan')).not.toBeNull()
  })
})
