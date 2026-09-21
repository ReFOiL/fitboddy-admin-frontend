import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AxiosError } from 'axios'
import { MemoryRouter } from 'react-router-dom'

import {
  PROFILE_ONBOARDING_STORAGE_PREFIX,
  ProfileOnboardingPage,
} from '../src/pages/ProfileOnboarding'

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  profileQuery: {
    data: undefined as Record<string, unknown> | undefined,
    error: undefined as unknown,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
}))

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({ user: { user_id: 'client-1', role: 'client' } }),
}))

vi.mock('../src/hooks/use-profile', () => ({
  useProfile: () => ({
    profileQuery: mocks.profileQuery,
    metaQuery: {
      data: {
        goals: [{ value: 'weight_loss', label: 'Снижение веса' }],
        levels: [{ value: 'beginner', label: 'Начинающий' }],
        workout_locations: [{ value: 'home', label: 'Дома' }],
        genders: [{ value: 'female', label: 'Женский' }],
        equipment: [],
      },
      isLoading: false,
    },
    draftMutation: {
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
    },
    upsertMutation: { mutate: mocks.mutate, isPending: false, isError: false },
  }),
}))

const storageKey = `${PROFILE_ONBOARDING_STORAGE_PREFIX}client-1`

const existingProfile = {
  user_id: 'client-1',
  full_name: '',
  city: null,
  bio: null,
  age: null,
  gender: null,
  goal: null,
  experience_level: null,
  workout_location: null,
  unavailable_equipment: ['barbell'],
  limitations: null,
  medical_notes: null,
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfileOnboardingPage />
    </MemoryRouter>,
  )
}

describe('ProfileOnboardingPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mocks.mutate.mockReset()
    mocks.profileQuery.data = existingProfile
    mocks.profileQuery.error = undefined
    mocks.profileQuery.isLoading = false
    mocks.profileQuery.isError = false
    vi.stubGlobal('scrollTo', vi.fn())
  })

  it.each([
    [1, 'Как тебя зовут?'],
    [2, 'Расскажи о тренировках'],
    [3, 'Последние детали'],
  ])('показывает шаг %i', (step, title) => {
    sessionStorage.setItem(storageKey, JSON.stringify({ step, draft: {} }))
    renderPage()
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByText(`Шаг ${step} из 3`)).toBeInTheDocument()
  })

  it('не показывает ошибку загрузки, если профиля ещё нет (404)', () => {
    const notFound = new AxiosError('Not Found')
    notFound.response = { status: 404, data: {}, statusText: 'Not Found', headers: {}, config: {} as never }
    mocks.profileQuery.data = undefined
    mocks.profileQuery.isError = true
    mocks.profileQuery.error = notFound

    renderPage()

    expect(screen.queryByText('Не удалось загрузить профиль')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Как тебя зовут?' })).toBeInTheDocument()
  })

  it('восстанавливает текущий шаг и draft после refresh', async () => {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        step: 3,
        draft: {
          full_name: 'Анна',
          goal: 'weight_loss',
          experience_level: 'beginner',
          workout_location: 'home',
          age: 27,
          gender: 'female',
        },
      }),
    )

    const firstRender = renderPage()
    expect(screen.getByLabelText('Возраст')).toHaveValue(27)
    firstRender.unmount()

    renderPage()
    expect(screen.getByText('Шаг 3 из 3')).toBeInTheDocument()
    expect(screen.getByLabelText('Возраст')).toHaveValue(27)
  })

  it('сохраняет первый шаг локально без финального PUT', async () => {
    mocks.mutate.mockImplementation((_payload, options) => options?.onSuccess?.())
    renderPage()

    fireEvent.change(screen.getByLabelText('Имя и фамилия'), { target: { value: 'Анна' } })
    fireEvent.click(screen.getByRole('button', { name: /Продолжить/ }))

    await waitFor(() => expect(screen.getByText('Шаг 2 из 3')).toBeInTheDocument())
    expect(mocks.mutate).not.toHaveBeenCalled()
    expect(JSON.parse(sessionStorage.getItem(storageKey) ?? '{}')).toMatchObject({
      step: 2,
      draft: { full_name: 'Анна' },
    })
  })

  it('отправляет полную анкету только на последнем шаге', async () => {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        step: 3,
        draft: {
          full_name: 'Анна',
          goal: 'weight_loss',
          experience_level: 'beginner',
          workout_location: 'home',
          age: 27,
          gender: 'female',
        },
      }),
    )
    mocks.mutate.mockImplementation((_payload, options) => options?.onSuccess?.())
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Завершить' }))

    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledOnce())
    expect(mocks.mutate.mock.calls[0][0]).toMatchObject({
      full_name: 'Анна',
      unavailable_equipment: ['barbell'],
      goal: 'weight_loss',
      experience_level: 'beginner',
      workout_location: 'home',
      age: 27,
      gender: 'female',
    })
  })
})
