import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import {
  PROFILE_ONBOARDING_STORAGE_PREFIX,
  ProfileOnboardingPage,
} from '../src/pages/ProfileOnboarding'

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  saveDraft: vi.fn(),
}))

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({ user: { user_id: 'client-1', role: 'client' } }),
}))

vi.mock('../src/hooks/use-profile', () => ({
  useProfile: () => ({
    profileQuery: {
      data: {
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
      },
      isLoading: false,
    },
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
      mutateAsync: mocks.saveDraft,
      isPending: false,
      isError: false,
    },
    upsertMutation: { mutate: mocks.mutate, isPending: false },
  }),
}))

const storageKey = `${PROFILE_ONBOARDING_STORAGE_PREFIX}client-1`

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
    mocks.saveDraft.mockReset()
    mocks.saveDraft.mockResolvedValue({})
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

  it('сохраняет первый шаг как draft без финального PUT', async () => {
    mocks.mutate.mockImplementation((_payload, options) => options?.onSuccess?.())
    renderPage()

    fireEvent.change(screen.getByLabelText('Имя и фамилия'), { target: { value: 'Анна' } })
    fireEvent.click(screen.getByRole('button', { name: /Продолжить/ }))

    await waitFor(() => expect(screen.getByText('Шаг 2 из 3')).toBeInTheDocument())
    expect(mocks.saveDraft).toHaveBeenCalledWith({ full_name: 'Анна' })
    expect(mocks.mutate).not.toHaveBeenCalled()
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
