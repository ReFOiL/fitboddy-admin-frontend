import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { act, type ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { StyledUpload } from '../src/components/media/StyledUpload'
import { formatUploadFileSize } from '../src/components/media/format-upload-size'
import { ExerciseThumb } from '../src/components/ui/kit'
import { persistTheme } from '../src/lib/theme'
import { CreateExercisePage } from '../src/pages/CreateExercise'
import { ExerciseDetailsPage } from '../src/pages/ExerciseDetails'
import { ExercisesPage } from '../src/pages/Exercises'
import type { TrainerExercise } from '../src/types/exercise'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const exercise: TrainerExercise = {
  row_id: 'row-bench',
  trainer_user_id: 'trainer-1',
  exercise_name: 'Жим лёжа',
  description: 'Лопатки сведены.',
  equipment: 'barbell',
  is_cardio: false,
  is_hold: false,
  difficulty: 2,
  workout_category: 'upper',
  default_sets: 3,
  default_reps: 8,
  default_duration_seconds: null,
  default_rest_seconds: 90,
  default_weight_kg: 40,
  load_scheme: 'flat',
  scheme_steps: [],
  is_active: true,
  video_url: null,
  start_image_url: null,
  end_image_url: null,
  created_at: '2026-09-01T10:00:00.000Z',
  updated_at: '2026-09-01T10:00:00.000Z',
  primary_muscles: [],
  secondary_muscles: [],
}

const addMutate = vi.fn()

vi.mock('../src/api/exercises', () => ({
  listMuscles: vi.fn().mockResolvedValue([]),
  getTrainerExercise: vi.fn().mockResolvedValue(null),
  previewTrainerCatalogSync: vi.fn().mockResolvedValue({
    summary: { new_count: 0, media_update_count: 0, unchanged_count: 0 },
    add: [],
    update: [],
    unchanged: [],
    unchanged_count: 0,
  }),
  applyTrainerCatalogSync: vi.fn(),
}))

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({ user: { user_id: 'trainer-1', role: 'trainer', login: 'marina' } }),
}))

vi.mock('../src/hooks/use-profile', () => ({
  useProfile: () => ({ profileQuery: { data: { gender: 'female' } } }),
}))

vi.mock('../src/hooks/use-exercises', () => ({
  useExercises: () => ({
    trainerCatalogQuery: { data: [exercise], isLoading: false, isError: false },
    addExerciseMutation: { mutate: addMutate, isPending: false },
    updateExerciseMutation: { mutate: vi.fn(), isPending: false },
    archiveExerciseMutation: { mutate: vi.fn(), isPending: false },
    restoreExerciseMutation: { mutate: vi.fn(), isPending: false },
    uploadVideoMutation: { mutate: vi.fn(), isPending: false },
    deleteVideoMutation: { mutate: vi.fn(), isPending: false },
    uploadPhotoMutation: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
    deletePhotoMutation: { mutate: vi.fn(), isPending: false },
    photoUploadProgress: null,
    videoUploadProgress: 35,
  }),
}))

function withQuery(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('exercise catalog ux', () => {
  beforeEach(() => {
    addMutate.mockReset()
    vi.mocked(toast.success).mockClear()
    document.documentElement.dataset.theme = 'light'
  })

  afterEach(() => {
    cleanup()
    act(() => {
      persistTheme('light')
      localStorage.removeItem('fitboddy-theme')
    })
  })

  it('formats a file size and hides the native file control', () => {
    expect(formatUploadFileSize(900)).toBe('900 Б')
    expect(formatUploadFileSize(1536)).toBe('1.5 КБ')
    expect(formatUploadFileSize(2.5 * 1024 * 1024)).toBe('2.5 МБ')

    render(
      <StyledUpload
        kind="video"
        id="exercise_video_upload"
        accept="video/mp4"
        fileName="clip.mp4"
        fileSizeLabel="12 МБ"
        progress={40}
        onFile={() => {}}
      />,
    )
    expect(screen.getByLabelText('Загрузить видео')).toHaveClass('sr-only')
    expect(screen.getByText('clip.mp4')).toBeInTheDocument()
    expect(screen.getByText(/12 МБ/)).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Прогресс загрузки видео' })).toHaveAttribute('aria-valuenow', '40')

    cleanup()
    render(<StyledUpload kind="video" id="video_empty" accept="video/mp4" compactEmpty onFile={() => {}} />)
    expect(screen.getByText(/Видео не загружено/)).toBeInTheDocument()
    expect(screen.getByText('Загрузить')).toBeInTheDocument()

    cleanup()
    render(<StyledUpload kind="avatar" id="avatar_upload" accept="image/png" previewUrl="" onFile={() => {}} />)
    expect(screen.getByLabelText('Изменить')).toHaveAttribute('type', 'file')
    expect(screen.getByLabelText('Изменить')).toHaveClass('sr-only')
  })

  it('uses a dark catalog tile instead of the light placeholder', async () => {
    act(() => persistTheme('dark'))
    const { container } = render(<ExerciseThumb />)
    expect(container.querySelector('img')?.getAttribute('src')).toContain('212833')

    act(() => persistTheme('light'))
    await waitFor(() => {
      expect(container.querySelector('img')?.getAttribute('src') ?? '').not.toContain('212833')
    })
  })

  it('keeps one list heading and searches by name', async () => {
    const router = createMemoryRouter([{ path: '/exercises', element: <ExercisesPage /> }], {
      initialEntries: ['/exercises'],
    })
    render(withQuery(<RouterProvider router={router} />))

    expect(screen.getByRole('heading', { name: 'Упражнения' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Список упражнений' })).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Поиск по названию')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Активные' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Архив' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Создать упражнение' })).toHaveAttribute('href', '/exercises/new')
    expect(screen.getByText('Жим лёжа')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Поиск по названию'), { target: { value: 'нет такого' } })
    expect(screen.queryByText('Жим лёжа')).not.toBeInTheDocument()
  })

  it('saves a new exercise onto its card with the video toast', async () => {
    addMutate.mockImplementation((_payload: unknown, options?: { onSuccess?: (created: { row_id: string }) => void }) => {
      options?.onSuccess?.({ row_id: 'row-new' })
    })
    const router = createMemoryRouter(
      [
        { path: '/exercises/new', element: <CreateExercisePage /> },
        { path: '/exercises/:rowId', element: <div>Карточка упражнения</div> },
      ],
      { initialEntries: ['/exercises/new'] },
    )
    render(withQuery(<RouterProvider router={router} />))

    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Болгарские выпады' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(addMutate).toHaveBeenCalled())
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Упражнение создано — добавьте видео'))
    await waitFor(() => expect(screen.getByText('Карточка упражнения')).toBeInTheDocument())
  })

  it('splits the exercise card and blocks leaving unsaved edits', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const router = createMemoryRouter(
      [
        { path: '/exercises/:rowId', element: <ExerciseDetailsPage /> },
        { path: '/exercises', element: <div>Список</div> },
      ],
      { initialEntries: ['/exercises/row-bench'] },
    )
    render(withQuery(<RouterProvider router={router} />))

    expect(screen.getByRole('button', { name: /Основное/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /Мышцы/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: /Нагрузка/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: /Фото и видео/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/Видео не загружено/)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Сохранение упражнения' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Жим лёжа узким хватом' } })
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeEnabled()

    fireEvent.click(screen.getByRole('link', { name: 'Назад к каталогу' }))
    expect(confirm).toHaveBeenCalled()
    expect(screen.queryByText('Список')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/exercises/row-bench')
  })
})
