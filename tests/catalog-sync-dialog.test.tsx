import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { applyTrainerCatalogSync, previewTrainerCatalogSync } from '../src/api/exercises'
import { CatalogSyncDialog } from '../src/components/exercises/CatalogSyncDialog'
import type { CatalogSyncPreview } from '../src/lib/catalog-sync'
import { ExercisesPage } from '../src/pages/Exercises'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../src/api/exercises', () => ({
  listMuscles: vi.fn(),
  previewTrainerCatalogSync: vi.fn(),
  applyTrainerCatalogSync: vi.fn(),
}))

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({ user: { user_id: 'trainer-1', role: 'trainer', login: 'marina' } }),
}))

vi.mock('../src/hooks/use-profile', () => ({
  useProfile: () => ({ profileQuery: { data: null } }),
}))

vi.mock('../src/hooks/use-exercises', () => ({
  useExercises: () => ({
    trainerCatalogQuery: { data: [], isLoading: false, isError: false },
    addExerciseMutation: { mutate: vi.fn(), isPending: false },
    updateExerciseMutation: { isPending: false },
    archiveExerciseMutation: { isPending: false },
    restoreExerciseMutation: { mutate: vi.fn(), isPending: false },
    uploadPhotoMutation: { mutateAsync: vi.fn(), isPending: false },
  }),
}))

const previewFixture: CatalogSyncPreview = {
  summary: { new_count: 2, media_update_count: 1, unchanged_count: 4 },
  unchanged_count: 4,
  add: [
    {
      id: 'squat',
      exercise_name: 'Приседания со штангой',
      muscles: ['Квадрицепсы', 'Ягодицы', 'Бицепс бедра'],
      start_image_url: '/photos/squat.jpg',
    },
    {
      id: 'deadlift',
      exercise_name: 'Становая тяга',
      muscles: ['Спина', 'Ягодицы'],
      start_image_url: null,
    },
  ],
  update: [
    {
      id: 'bench',
      exercise_name: 'Жим лёжа',
      yours: { start_image_url: '/photos/bench.jpg', end_image_url: null, video_url: null },
      system: {
        start_image_url: '/photos/bench.jpg',
        end_image_url: '/photos/bench-end.jpg',
        video_url: '/videos/bench.mp4',
      },
      trainer_exercise_id: 'tr-bench',
      changed_fields: ['end_image_url', 'video_url'],
      changes: ['+ end-фото', 'обновлено видео'],
    },
  ],
}

function renderDialog(onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const view = render(
    <QueryClientProvider client={queryClient}>
      <CatalogSyncDialog trainerUserId="trainer-1" onClose={onClose} />
    </QueryClientProvider>,
  )
  return { ...view, onClose }
}

function wrapper(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('CatalogSyncDialog', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.mocked(previewTrainerCatalogSync).mockResolvedValue(previewFixture)
    vi.mocked(applyTrainerCatalogSync).mockResolvedValue({ added_count: 1, updated_count: 1 })
  })

  it('selects new exercises, keeps media updates off, and shows the skip count', async () => {
    renderDialog()

    expect(await screen.findByRole('button', { name: 'Синхронизировать выбранное (2)' })).toBeEnabled()
    expect(screen.getByRole('status')).toHaveAccessibleName('+2 новых · ~1 обновление медиа · 4 без изменений')
    expect(screen.getByRole('checkbox', { name: 'Приседания со штангой' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Становая тяга' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Отметить все в разделе «Обновить»' })).toBeDisabled()
    expect(screen.getByText('Квадрицепсы')).toBeInTheDocument()
    expect(screen.queryByText('В системе')).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Также подтянуть медиа из системы' })).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(screen.getByRole('button', { name: /Пропустить · 4/ }))
    expect(screen.getByText('Эти упражнения уже совпадают с системной базой и не изменятся.')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /Пропустить/ })).not.toBeInTheDocument()
  })

  it('uses an indeterminate select-all and restores the section in one click', async () => {
    renderDialog()
    await screen.findByRole('checkbox', { name: 'Становая тяга' })

    fireEvent.click(screen.getByRole('checkbox', { name: 'Становая тяга' }))
    expect(screen.getByRole('button', { name: 'Синхронизировать выбранное (1)' })).toBeEnabled()
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Отметить все в разделе «Добавить»' })).toBePartiallyChecked()
    })

    fireEvent.click(screen.getByRole('checkbox', { name: 'Отметить все в разделе «Добавить»' }))
    expect(screen.getByRole('checkbox', { name: 'Становая тяга' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Приседания со штангой' })).toBeChecked()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Отметить все в разделе «Добавить»' }))
    expect(screen.getByRole('checkbox', { name: 'Становая тяга' })).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Синхронизировать выбранное (0)' })).toBeDisabled()
  })

  it('shows the media diff only after the toggle and applies the selected ids', async () => {
    const { onClose } = renderDialog()
    await screen.findByRole('checkbox', { name: 'Становая тяга' })

    fireEvent.click(screen.getByRole('checkbox', { name: 'Становая тяга' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Также подтянуть медиа из системы' }))

    expect(screen.getByRole('switch', { name: 'Также подтянуть медиа из системы' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('В системе')).toBeInTheDocument()
    expect(screen.getByText('У тебя')).toBeInTheDocument()
    expect(screen.getByText('нет end-фото.')).toBeInTheDocument()
    expect(screen.getByText('+ end-фото · обновлено видео')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Жим лёжа' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Синхронизировать выбранное (2)' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Синхронизировать выбранное (2)' }))

    await waitFor(() => expect(applyTrainerCatalogSync).toHaveBeenCalledTimes(1))
    expect(applyTrainerCatalogSync).toHaveBeenCalledWith('trainer-1', {
      add_ids: ['squat'],
      update_ids: ['bench'],
      include_media: true,
    })
    expect(toast.success).toHaveBeenCalledWith('Каталог синхронизирован', { description: 'добавлено 1, обновлено 1.' })
    expect(onClose).toHaveBeenCalled()
  })

  it('keeps the dialog open when apply fails', async () => {
    vi.mocked(applyTrainerCatalogSync).mockRejectedValue(new Error('down'))
    const { onClose } = renderDialog()
    fireEvent.click(await screen.findByRole('button', { name: 'Синхронизировать выбранное (2)' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Не удалось синхронизировать каталог.'))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Синхронизация с системной базой' })).toBeInTheDocument()
  })

  it('explains an empty preview', async () => {
    vi.mocked(previewTrainerCatalogSync).mockResolvedValue({
      summary: { new_count: 0, media_update_count: 0, unchanged_count: 0 },
      add: [],
      update: [],
      unchanged_count: 0,
    })
    renderDialog()

    expect(await screen.findByText('Нечего синхронизировать')).toBeInTheDocument()
    expect(screen.getByText('Каталог уже совпадает с системной базой.')).toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Синхронизировать выбранное (0)' })).toBeDisabled()
  })

  it('retries a failed preview', async () => {
    vi.mocked(previewTrainerCatalogSync).mockRejectedValue(new Error('down'))
    renderDialog()

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить предпросмотр')
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    await waitFor(() => expect(previewTrainerCatalogSync).toHaveBeenCalledTimes(2))
  })

  it('opens the dialog from the trainer exercises screen', async () => {
    render(
      wrapper(
        <MemoryRouter>
          <ExercisesPage />
        </MemoryRouter>,
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Синхронизировать с системной базой' }))
    expect(await screen.findByRole('dialog', { name: 'Синхронизация с системной базой' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Синхронизировать выбранное (2)' })).toBeEnabled()
  })
})
