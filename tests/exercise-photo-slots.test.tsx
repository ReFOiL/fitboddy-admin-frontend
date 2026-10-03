import { fireEvent, render, screen } from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ExercisePhotoSlots } from '../src/components/exercises/ExercisePhotoSlots'

const API_BASE = 'https://media.example.test'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('../src/lib/exercise-photos', async () => {
  const actual = await vi.importActual<typeof import('../src/lib/exercise-photos')>(
    '../src/lib/exercise-photos',
  )
  return {
    ...actual,
    resolveExerciseMediaUrl: (url: string | null | undefined) => actual.resolveExerciseMediaUrl(url, API_BASE),
  }
})

describe('ExercisePhotoSlots', () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows labeled side-by-side cards for clients without upload controls', () => {
    render(
      <ExercisePhotoSlots
        startImageUrl="/media/start.jpg"
        endImageUrl={null}
      />,
    )

    expect(screen.getByText('Исходное положение')).toBeInTheDocument()
    expect(screen.getByText('Конечное положение')).toBeInTheDocument()
    expect(screen.getByAltText('Исходное положение')).toHaveAttribute(
      'src',
      `${API_BASE}/media/start.jpg`,
    )
    expect(screen.getByText('Фото пока не загружено.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Загрузить фото')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Удалить фото' })).not.toBeInTheDocument()
  })

  it('lets trainers upload, replace and delete start/end photos', () => {
    const onUpload = vi.fn()
    const onDelete = vi.fn()

    render(
      <ExercisePhotoSlots
        exercise={{ start_image_url: '/media/start.jpg', end_image_url: null }}
        editable
        onUpload={onUpload}
        onDelete={onDelete}
      />,
    )

    expect(screen.getByLabelText('Заменить фото')).toBeInTheDocument()
    expect(screen.getByLabelText('Загрузить фото')).toBeInTheDocument()
    expect(screen.getAllByText('Поддерживаются JPG, PNG и WEBP, до 15 МБ.')).toHaveLength(2)
    expect(screen.getByText('Фото ещё не загружено.')).toBeInTheDocument()

    const startFile = new File([new Uint8Array(8)], 'start.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('Заменить фото'), { target: { files: [startFile] } })
    expect(onUpload).toHaveBeenCalledWith('start', startFile)

    fireEvent.click(screen.getByRole('button', { name: 'Удалить фото' }))
    expect(window.confirm).toHaveBeenCalledWith('Удалить фото «Исходное положение»?')
    expect(onDelete).toHaveBeenCalledWith('start')
  })

  it('does not delete a photo when confirmation is cancelled', () => {
    const onDelete = vi.fn()
    vi.mocked(window.confirm).mockReturnValue(false)

    render(
      <ExercisePhotoSlots
        exercise={{ start_image_url: '/media/start.jpg', end_image_url: null }}
        editable
        onDelete={onDelete}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Удалить фото' }))
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('puts relative signed urls on the API origin and keeps absolute urls opaque', () => {
    const signed = '/api/v1/trainers/media/start?exp=1710000000&sig=ab+cd%2Fef'
    const { rerender } = render(<ExercisePhotoSlots startImageUrl={signed} />)

    expect(screen.getByAltText('Исходное положение')).toHaveAttribute('src', `${API_BASE}${signed}`)

    const absolute = 'https://cdn.example.test/end.webp?sig=ab+cd'
    rerender(<ExercisePhotoSlots endImageUrl={absolute} />)
    expect(screen.getByAltText('Конечное положение')).toHaveAttribute('src', absolute)
  })

  it('asks for a fresh signed url when the image fails, once per url', () => {
    const onImageError = vi.fn()
    const first = '/api/v1/trainers/media/a?sig=1'
    const second = '/api/v1/trainers/media/a?sig=2'
    const third = '/api/v1/trainers/media/a?sig=3'
    const { rerender } = render(<ExercisePhotoSlots startImageUrl={first} onImageError={onImageError} />)

    const failStart = () => fireEvent.error(screen.getByAltText('Исходное положение'))
    failStart()
    failStart()
    expect(onImageError).toHaveBeenCalledTimes(1)
    expect(onImageError).toHaveBeenCalledWith('start')

    rerender(<ExercisePhotoSlots startImageUrl={second} onImageError={onImageError} />)
    failStart()
    expect(onImageError).toHaveBeenCalledTimes(2)

    rerender(<ExercisePhotoSlots startImageUrl={third} onImageError={onImageError} />)
    failStart()
    expect(onImageError).toHaveBeenCalledTimes(2)

    fireEvent.load(screen.getByAltText('Исходное положение'))
    rerender(<ExercisePhotoSlots startImageUrl={`${third}&next=1`} onImageError={onImageError} />)
    failStart()
    expect(onImageError).toHaveBeenCalledTimes(3)
  })

  it('shows upload progress for the busy photo slot', () => {
    render(
      <ExercisePhotoSlots
        startImageUrl="/media/start.jpg"
        editable
        busyPosition="start"
        busyAction="upload"
        uploadProgress={40}
      />,
    )

    expect(screen.getByText('Загружаем фото... 40%')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Прогресс загрузки фото' })).toHaveAttribute(
      'aria-valuenow',
      '40',
    )
  })

  it('blocks invalid files before calling the API', () => {
    const onUpload = vi.fn()
    render(<ExercisePhotoSlots editable onUpload={onUpload} />)

    const badFile = new File([new Uint8Array(8)], 'clip.mp4', { type: 'video/mp4' })
    fireEvent.change(screen.getAllByLabelText('Загрузить фото')[0], { target: { files: [badFile] } })

    expect(onUpload).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Можно загрузить JPG, PNG или WEBP.')
  })

  it('shows video-like loading copy for the busy photo slot', () => {
    render(
      <ExercisePhotoSlots
        startImageUrl="/media/start.jpg"
        editable
        busyPosition="start"
        busyAction="upload"
      />,
    )

    expect(screen.getByText('Загружаем фото...')).toBeInTheDocument()
    expect(screen.getByText('Не закрывай страницу, пока файл не сохранится.')).toBeInTheDocument()
    expect(screen.getByLabelText('Заменить фото')).toBeDisabled()
  })
})
