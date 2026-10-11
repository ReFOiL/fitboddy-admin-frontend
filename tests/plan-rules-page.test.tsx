import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

import { listTrainerExercises } from '../src/api/exercises'
import { getTrainerGenerationPolicy, upsertTrainerGenerationPolicy } from '../src/api/plans'
import { PlanRulesPage } from '../src/pages/PlanRules'

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({ user: { user_id: 'trainer-1', role: 'trainer' } }),
}))

vi.mock('../src/api/plans', () => ({
  getTrainerGenerationPolicy: vi.fn(),
  upsertTrainerGenerationPolicy: vi.fn(),
}))

vi.mock('../src/api/exercises', () => ({
  listTrainerExercises: vi.fn(),
}))

const savedPolicy = {
  excluded_pairs: [],
  default_splits: {},
  default_workouts_per_week: { beginner: 3, intermediate: 3, advanced: 3 },
  exercises_per_session: {},
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const router = createMemoryRouter([{ path: '*', element: <PlanRulesPage /> }])
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('PlanRulesPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('держит сохранение над мобильной панелью и показывает ошибку каталога', async () => {
    vi.mocked(getTrainerGenerationPolicy).mockResolvedValue(savedPolicy)
    vi.mocked(listTrainerExercises).mockRejectedValue(new Error('catalog down'))

    renderPage()

    const saveBar = await screen.findByRole('region', { name: 'Сохранение правил' })
    expect(saveBar.className).toContain('bottom-[calc(4.25rem+env(safe-area-inset-bottom))]')
    expect(saveBar.className).toContain('z-40')
    expect(screen.getByRole('heading', { name: 'Правила планов' }).closest('section')).toHaveClass('pb-40')
    expect(screen.getByText('Правила сохранены')).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить каталог упражнений.')
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument()
  })

  it('не отправляет пустой или нулевой ввод и показывает текст ошибки сервера', async () => {
    vi.mocked(getTrainerGenerationPolicy).mockResolvedValue(savedPolicy)
    vi.mocked(listTrainerExercises).mockResolvedValue([])
    vi.mocked(upsertTrainerGenerationPolicy).mockRejectedValue({
      isAxiosError: true,
      response: { status: 422, data: { detail: 'Слишком много тренировок в неделю' } },
    })

    renderPage()

    const beginner = await screen.findByRole('spinbutton', { name: /Новичок/ })
    fireEvent.change(beginner, { target: { value: '' } })
    expect(beginner).toHaveValue(3)
    expect(screen.getByRole('button', { name: 'Сохранить правила' })).toBeDisabled()

    fireEvent.change(beginner, { target: { value: '0' } })
    expect(beginner).toHaveValue(1)

    const minimums = screen.getAllByRole('spinbutton', { name: 'минимум' })
    fireEvent.change(minimums[0], { target: { value: '' } })
    expect(minimums[0]).toHaveValue(4)
    fireEvent.change(minimums[0], { target: { value: '20' } })
    expect(minimums[0]).toHaveValue(12)

    fireEvent.change(beginner, { target: { value: '9' } })
    expect(beginner).toHaveValue(7)
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить правила' }))

    await waitFor(() => expect(upsertTrainerGenerationPolicy).toHaveBeenCalled())
    expect(vi.mocked(upsertTrainerGenerationPolicy).mock.calls[0]?.[1]).toMatchObject({
      default_workouts_per_week: { beginner: 7 },
      exercises_per_session: { default: { min: 12, max: 12 } },
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('Слишком много тренировок в неделю')
  })
})
