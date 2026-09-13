import { fireEvent, render, screen } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ExercisePhotoSlots } from '../src/components/exercises/ExercisePhotoSlots'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

describe('ExercisePhotoSlots', () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear()
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
    expect(screen.getByAltText('Исходное положение')).toHaveAttribute('src', '/media/start.jpg')
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
    expect(onDelete).toHaveBeenCalledWith('start')
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
