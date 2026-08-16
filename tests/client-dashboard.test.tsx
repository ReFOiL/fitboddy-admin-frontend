import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { DashboardPage } from '../src/pages/Dashboard'
import type { PlanDay, TodayWorkout, TrainingPlan } from '../src/types/plan'

const mocks = vi.hoisted(() => ({
  user: {
    user_id: 'client-1',
    tenant_id: 'tenant-1',
    login: 'client',
    email: 'client@example.com',
    role: 'client',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  model: {} as Record<string, unknown>,
  conversations: [] as Array<Record<string, unknown>>,
  unreadCount: 0,
  runGenerate: vi.fn(),
}))

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({ user: mocks.user }),
}))

vi.mock('../src/hooks/use-client-plan-model', () => ({
  useClientPlanModel: () => mocks.model,
}))

vi.mock('../src/hooks/use-messages', () => ({
  useUnreadCount: () => ({ data: { unread_count: mocks.unreadCount } }),
  useConversations: () => ({ data: mocks.conversations }),
}))

const day: PlanDay = {
  day_id: 'day-1',
  day_index: 1,
  scheduled_for: '2026-08-16',
  week: 1,
  day_of_week: 6,
  volume_multiplier: 1,
  is_completed: false,
  completed_at: null,
  exercises: [
    {
      line_id: 'line-1',
      exercise_id: 'exercise-1',
      exercise_name: 'Присед',
      category: 'legs',
      is_cardio: false,
      sort_order: 1,
      sets: 3,
      reps: 10,
      duration_seconds: null,
      rest_seconds: 60,
      weight_kg: 20,
      set_prescriptions: [],
    },
  ],
}

const plan: TrainingPlan = {
  plan_id: 'plan-1',
  source: 'system',
  trainer_user_id: null,
  user_id: 'client-1',
  status: 'active',
  goal: 'maintenance',
  level: 'beginner',
  workouts_per_week: 3,
  start_date: '2026-08-16',
  end_date: '2026-09-16',
  created_at: '2026-08-16T00:00:00Z',
  updated_at: '2026-08-16T00:00:00Z',
  days: [day],
}

const workout: TodayWorkout = {
  plan_id: plan.plan_id,
  source: 'system',
  trainer_user_id: null,
  ...day,
  is_completed: false,
  completed_at: null,
}

function baseModel(overrides: Record<string, unknown> = {}) {
  return {
    clientActiveRelationQuery: { isLoading: false },
    profileQuery: { isLoading: false },
    activePlanQuery: { isLoading: false },
    todayWorkoutQuery: { isLoading: false, isError: false },
    generatePlanMutation: { isPending: false },
    completeDayMutation: { isPending: false, mutate: vi.fn() },
    replaceExerciseMutation: { isPending: false, mutate: vi.fn() },
    profile: { age: 30 },
    questionnaireReady: true,
    hasNoProfile: false,
    hasProfileError: false,
    hasActiveTrainer: false,
    hasNoActivePlan: true,
    hasActivePlan: false,
    activePlan: undefined,
    todayWorkout: undefined,
    hasNoTodayWorkout: true,
    canGenerateSystemPlan: true,
    canGenerateTrainerPlan: false,
    activeTrainerDisplay: '',
    todayIso: '2026-08-16',
    showNextCycleCta: false,
    currentAdherence: null,
    runGenerate: mocks.runGenerate,
    ...overrides,
  }
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}

describe('client Dashboard', () => {
  beforeEach(() => {
    mocks.runGenerate.mockReset()
    mocks.unreadCount = 0
    mocks.conversations = []
    mocks.user.role = 'client'
  })

  it('показывает единственный CTA для незавершённого профиля', () => {
    mocks.model = baseModel({ profile: { age: null }, questionnaireReady: false })
    renderDashboard()

    expect(screen.getByRole('heading', { name: 'Сегодня' })).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Продолжить заполнение' })).toHaveAttribute('href', '/profile/onboarding')
    expect(screen.queryByText('Добро пожаловать')).not.toBeInTheDocument()
  })

  it('создаёт самостоятельный план и предлагает выбрать тренера', () => {
    mocks.model = baseModel()
    renderDashboard()

    fireEvent.click(screen.getByRole('button', { name: 'Тренироваться самостоятельно' }))
    expect(mocks.runGenerate).toHaveBeenCalledWith('system')
    expect(screen.getByRole('link', { name: 'выбрать тренера' })).toHaveAttribute('href', '/trainers')
  })

  it('запускает session mode из тренировки на сегодня', () => {
    mocks.model = baseModel({
      hasNoActivePlan: false,
      hasActivePlan: true,
      activePlan: plan,
      todayWorkout: workout,
      hasNoTodayWorkout: false,
    })
    renderDashboard()

    fireEvent.click(screen.getByRole('button', { name: 'Начать тренировку' }))
    expect(screen.getByRole('button', { name: 'Свернуть' })).toBeInTheDocument()
    expect(screen.getByText('0/1 упражнений')).toBeInTheDocument()
  })

  it('в день отдыха ведёт к расписанию', () => {
    mocks.model = baseModel({
      hasNoActivePlan: false,
      hasActivePlan: true,
      activePlan: { ...plan, days: [{ ...day, scheduled_for: '2026-08-17' }] },
    })
    renderDashboard()

    expect(screen.getByText('День отдыха')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Посмотреть расписание' })).toHaveAttribute(
      'href',
      '/plan-generation',
    )
  })

  it('показывает следующий цикл и preview непрочитанного сообщения', () => {
    mocks.unreadCount = 2
    mocks.conversations = [
      {
        conversation_id: 'conversation-1',
        unread_count: 2,
        last_message: { body: 'Как самочувствие?', sender_user_id: 'trainer-1' },
      },
    ]
    mocks.model = baseModel({
      hasNoActivePlan: false,
      hasActivePlan: true,
      activePlan: { ...plan, days: [{ ...day, is_completed: true }] },
      showNextCycleCta: true,
      currentAdherence: 100,
    })
    renderDashboard()

    expect(screen.getByText('Как самочувствие?')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Новых сообщений: 2/ })).toHaveAttribute(
      'href',
      '/messages/conversation-1',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Следующий цикл' }))
    expect(mocks.runGenerate).toHaveBeenCalledWith('system')
  })

  it('сохраняет trainer Dashboard с Hero и быстрыми действиями', () => {
    mocks.user.role = 'trainer'
    renderDashboard()

    expect(screen.queryByRole('heading', { name: 'Сегодня' })).not.toBeInTheDocument()
    expect(screen.getByText('Клиенты и связи')).toBeInTheDocument()
    expect(screen.getByText('Тренер')).toBeInTheDocument()
  })
})
