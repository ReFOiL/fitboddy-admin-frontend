import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

import { ProfilePage } from '../src/pages/Profile'

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  profile: {
    user_id: 'client-1',
    full_name: 'Анна',
    avatar_url: null,
    city: 'Москва',
    bio: '',
    age: 27,
    gender: 'female',
    goal: 'weight_loss',
    experience_level: 'beginner',
    workout_location: 'home',
    unavailable_equipment: ['barbell'],
    limitations: null as string | null,
    medical_notes: null as string | null,
  },
}))

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { user_id: 'client-1', role: 'client' },
    logoutMutation: { mutate: vi.fn(), isPending: false },
  }),
}))

vi.mock('../src/hooks/use-profile', () => ({
  useProfile: () => ({
    profileQuery: {
      data: mocks.profile,
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: vi.fn(),
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
      isError: false,
      error: undefined,
      refetch: vi.fn(),
    },
    upsertMutation: { mutate: mocks.mutate, isPending: false, isError: false },
    uploadAvatarMutation: { mutate: vi.fn(), isPending: false },
  }),
}))

function renderPage() {
  const router = createMemoryRouter([{ path: '*', element: <ProfilePage /> }])
  return render(<RouterProvider router={router} />)
}

describe('ProfilePage health consent', () => {
  beforeEach(() => {
    mocks.mutate.mockReset()
    mocks.profile.limitations = null
    mocks.profile.medical_notes = null
    mocks.profile.city = 'Москва'
  })

  it('ставит согласие перед полями здоровья', async () => {
    renderPage()
    const consent = await screen.findByRole('checkbox', { name: /показ их тренеру/ })
    const limitations = screen.getByLabelText('Ограничения')
    expect(consent.compareDocumentPosition(limitations) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(consent).not.toBeChecked()
  })

  it('сохраняет остальные поля без согласия, если текст о здоровье пуст', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByLabelText('Город')).toHaveValue('Москва'))
    fireEvent.change(screen.getByLabelText('Город'), { target: { value: 'Казань' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledOnce())
    expect(mocks.mutate.mock.calls[0][0]).toMatchObject({
      city: 'Казань',
      full_name: 'Анна',
      limitations: null,
      medical_notes: null,
    })
    expect(mocks.mutate.mock.calls[0][0]).not.toHaveProperty('health_data_consent')
  })

  it('не сохраняет профиль, если введён текст о здоровье без согласия', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByLabelText('Город')).toHaveValue('Москва'))
    fireEvent.change(screen.getByLabelText('Ограничения'), { target: { value: 'травма колена' } })
    fireEvent.change(screen.getByLabelText('Медицинские заметки'), { target: { value: 'астма' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/согласие/))
    expect(mocks.mutate).not.toHaveBeenCalled()
  })

  it('не даёт пересохранить уже лежащий текст без согласия', async () => {
    mocks.profile.limitations = 'старая травма'
    mocks.profile.medical_notes = 'астма'
    renderPage()

    await waitFor(() => expect(screen.getByLabelText('Ограничения')).toHaveValue('старая травма'))
    fireEvent.change(screen.getByLabelText('Город'), { target: { value: 'Казань' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/очистите/))
    expect(mocks.mutate).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Ограничения')).toHaveValue('старая травма')
  })

  it('отправляет текст о здоровье после согласия', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByLabelText('Город')).toHaveValue('Москва'))
    fireEvent.click(screen.getByRole('checkbox', { name: /показ их тренеру/ }))
    fireEvent.change(screen.getByLabelText('Ограничения'), { target: { value: 'травма колена' } })
    fireEvent.change(screen.getByLabelText('Медицинские заметки'), { target: { value: 'астма' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledOnce())
    expect(mocks.mutate.mock.calls[0][0]).toMatchObject({
      limitations: 'травма колена',
      medical_notes: 'астма',
    })
    expect(mocks.mutate.mock.calls[0][0]).not.toHaveProperty('health_data_consent')
  })
})
