import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AxiosError } from 'axios'
import { MemoryRouter, useLocation } from 'react-router-dom'

import { savePendingInviteCode } from '../src/lib/invite'
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

function LocationProbe() {
  const { pathname } = useLocation()
  return <div data-testid="location">{pathname}</div>
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfileOnboardingPage />
      <LocationProbe />
    </MemoryRouter>,
  )
}

describe('ProfileOnboardingPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    mocks.mutate.mockReset()
    mocks.profileQuery.data = existingProfile
    mocks.profileQuery.error = undefined
    mocks.profileQuery.isLoading = false
    mocks.profileQuery.isError = false
    vi.stubGlobal('scrollTo', vi.fn())
  })

  it.each([
    [1, 'Расскажите о тренировках', 'Шаг 1 из 2'],
    [3, 'Последние детали', 'Шаг 2 из 2'],
  ])('показывает сохранённый шаг %i', (step, title, progress) => {
    sessionStorage.setItem(storageKey, JSON.stringify({ step, draft: {} }))
    renderPage()
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByText(progress)).toBeInTheDocument()
  })

  it('не показывает ошибку загрузки, если профиля ещё нет (404)', () => {
    const notFound = new AxiosError('Not Found')
    notFound.response = { status: 404, data: {}, statusText: 'Not Found', headers: {}, config: {} as never }
    mocks.profileQuery.data = undefined
    mocks.profileQuery.isError = true
    mocks.profileQuery.error = notFound

    renderPage()

    expect(screen.queryByText('Не удалось загрузить профиль')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Расскажите о тренировках' })).toBeInTheDocument()
    expect(screen.getByLabelText('Цель')).toBeInTheDocument()
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
    expect(screen.getByText('Шаг 2 из 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Возраст')).toHaveValue(27)
  })

  it('сохраняет шаг тренировок локально и не требует имя', async () => {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        step: 1,
        draft: {
          goal: 'weight_loss',
          experience_level: 'beginner',
          workout_location: 'home',
        },
      }),
    )
    mocks.mutate.mockImplementation((_payload, options) => options?.onSuccess?.())
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Продолжить/ }))

    await waitFor(() => expect(screen.getByText('Шаг 2 из 2')).toBeInTheDocument())
    expect(mocks.mutate).not.toHaveBeenCalled()
    expect(JSON.parse(sessionStorage.getItem(storageKey) ?? '{}')).toMatchObject({
      step: 2,
      version: 2,
      draft: { goal: 'weight_loss' },
    })
  })

  it('на пустом первом шаге фокусирует цель и пишет одну и ту же форму ошибки', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Продолжить/ }))
    expect(await screen.findByText('Выберите цель')).toBeInTheDocument()
    expect(screen.getByText('Выберите уровень')).toBeInTheDocument()
    expect(screen.getByLabelText('Цель')).toHaveFocus()
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
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/)
    expect(mocks.mutate.mock.calls[0][0]).toMatchObject({
      full_name: 'Анна',
      unavailable_equipment: ['barbell'],
      goal: 'weight_loss',
      experience_level: 'beginner',
      workout_location: 'home',
      age: 27,
      gender: 'female',
      limitations: null,
      medical_notes: null,
    })
    expect(mocks.mutate.mock.calls[0][0]).not.toHaveProperty('health_data_consent')
  })

  it('ставит согласие перед полями здоровья', () => {
    sessionStorage.setItem(storageKey, JSON.stringify({ step: 3, draft: { age: 27, gender: 'female' } }))
    renderPage()

    const consent = screen.getByRole('checkbox', { name: /показ их тренеру/ })
    const limitations = screen.getByLabelText('Ограничения')
    const notes = screen.getByLabelText('Медицинские заметки')
    expect(consent.compareDocumentPosition(limitations) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(limitations.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(consent).toHaveAccessibleName(/обработку ограничений и медицинских заметок/)
  })

  it('не отправляет текст о здоровье без согласия', async () => {
    mocks.profileQuery.data = {
      ...existingProfile,
      full_name: 'Анна',
      goal: 'weight_loss',
      experience_level: 'beginner',
      workout_location: 'home',
      age: 31,
      gender: 'female',
    }
    sessionStorage.setItem(storageKey, JSON.stringify({ step: 3, draft: {} }))
    renderPage()

    await waitFor(() => expect(screen.getByLabelText('Возраст')).toHaveValue(31))
    fireEvent.change(screen.getByLabelText('Ограничения'), { target: { value: 'травма колена' } })
    fireEvent.click(screen.getByRole('button', { name: 'Завершить' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/согласие/))
    expect(mocks.mutate).not.toHaveBeenCalled()
  })

  it('отправляет текст о здоровье, если согласие отмечено', async () => {
    mocks.profileQuery.data = {
      ...existingProfile,
      full_name: 'Анна',
      goal: 'weight_loss',
      experience_level: 'beginner',
      workout_location: 'home',
      age: 31,
      gender: 'female',
    }
    sessionStorage.setItem(storageKey, JSON.stringify({ step: 3, draft: {} }))
    mocks.mutate.mockImplementation((_payload, options) => options?.onSuccess?.())
    renderPage()

    await waitFor(() => expect(screen.getByLabelText('Возраст')).toHaveValue(31))
    fireEvent.click(screen.getByRole('checkbox', { name: /показ их тренеру/ }))
    fireEvent.change(screen.getByLabelText('Ограничения'), { target: { value: '  травма колена  ' } })
    fireEvent.change(screen.getByLabelText('Медицинские заметки'), { target: { value: 'астма' } })
    fireEvent.click(screen.getByRole('button', { name: 'Завершить' }))

    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledOnce())
    expect(mocks.mutate.mock.calls[0][0]).toMatchObject({
      limitations: 'травма колена',
      medical_notes: 'астма',
      full_name: 'Анна',
    })
    expect(mocks.mutate.mock.calls[0][0]).not.toHaveProperty('health_data_consent')
  })

  it('после анкеты открывает приглашение, если код сохранён', async () => {
    savePendingInviteCode('AB3K9Z')
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

    expect(await screen.findByText('Подключаем к тренеру…')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/i/AB3K9Z'))
  })

  it('показывает согласие представителя под возрастом младше 18 и не отмечает его', () => {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        step: 3,
        draft: {
          full_name: 'Анна',
          goal: 'weight_loss',
          experience_level: 'beginner',
          workout_location: 'home',
          age: 16,
          gender: 'female',
          guardian_consent: true,
        },
      }),
    )
    renderPage()

    const checkbox = screen.getByRole('checkbox', { name: /законный представитель/i })
    const age = screen.getByLabelText('Возраст')
    expect(checkbox).not.toBeChecked()
    expect(age.compareDocumentPosition(checkbox) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(checkbox.compareDocumentPosition(screen.getByLabelText('Ограничения')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('link', { name: 'обработку данных ребёнка' })).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: 'пользовательскому соглашению' })).toHaveAttribute('href', '/terms')
  })

  it('не даёт завершить анкету младше 18 без согласия представителя', async () => {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        step: 3,
        draft: {
          full_name: 'Анна',
          goal: 'weight_loss',
          experience_level: 'beginner',
          workout_location: 'home',
          age: 10,
          gender: 'female',
        },
      }),
    )
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Завершить' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Для возраста младше 18 нужно согласие законного представителя.',
    )
    expect(mocks.mutate).not.toHaveBeenCalled()
  })

  it('после согласия представителя сохраняет возраст 10 и не шлёт саму галочку', async () => {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        step: 3,
        draft: {
          full_name: 'Анна',
          goal: 'weight_loss',
          experience_level: 'beginner',
          workout_location: 'home',
          age: 10,
          gender: 'female',
        },
      }),
    )
    mocks.mutate.mockImplementation((_payload, options) => options?.onSuccess?.())
    renderPage()

    fireEvent.click(screen.getByRole('checkbox', { name: /законный представитель/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Завершить' }))

    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledOnce())
    expect(mocks.mutate.mock.calls[0][0]).toMatchObject({
      age: 10,
      limitations: null,
      medical_notes: null,
    })
    expect(mocks.mutate.mock.calls[0][0]).not.toHaveProperty('guardian_consent')
  })

  it('младше 18 не отправляет здоровье без согласия представителя, даже если отмечено согласие на заметки', async () => {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        step: 3,
        draft: {
          full_name: 'Анна',
          goal: 'weight_loss',
          experience_level: 'beginner',
          workout_location: 'home',
          age: 16,
          gender: 'female',
        },
      }),
    )
    renderPage()

    fireEvent.click(screen.getByRole('checkbox', { name: /показ их тренеру/ }))
    fireEvent.change(screen.getByLabelText('Ограничения'), { target: { value: 'травма колена' } })
    fireEvent.click(screen.getByRole('button', { name: 'Завершить' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/законного представителя/)
    expect(mocks.mutate).not.toHaveBeenCalled()
  })

  it('с 18 лет прячет согласие представителя и не мешает завершению', async () => {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        step: 3,
        draft: {
          full_name: 'Анна',
          goal: 'weight_loss',
          experience_level: 'beginner',
          workout_location: 'home',
          age: 18,
          gender: 'female',
        },
      }),
    )
    mocks.mutate.mockImplementation((_payload, options) => options?.onSuccess?.())
    renderPage()

    expect(screen.queryByRole('checkbox', { name: /законный представитель/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Завершить' }))

    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledOnce())
    expect(mocks.mutate.mock.calls[0][0]).toMatchObject({ age: 18 })
  })
})
