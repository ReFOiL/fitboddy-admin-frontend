import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'

import { CreateExercisePhotoField } from '../src/components/exercises/CreateExercisePhotoField'
import { ExercisePhotoSlots } from '../src/components/exercises/ExercisePhotoSlots'
import { EXERCISE_PHOTO_EXPORT_QUALITY } from '../src/lib/exercise-photo-crop'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('react-easy-crop', async () => {
  const React = await import('react')

  function MockCropper(props: {
    zoom?: number
    onCropComplete?: (
      area: { x: number; y: number; width: number; height: number },
      pixels: { x: number; y: number; width: number; height: number },
    ) => void
  }) {
    const { onCropComplete, zoom } = props
    React.useEffect(() => {
      onCropComplete?.(
        { x: 0, y: 0, width: 80, height: 60 },
        { x: 12, y: 24, width: 2400, height: 1800 },
      )
    }, [onCropComplete])
    return React.createElement('div', {
      'data-testid': 'exercise-photo-cropper',
      'data-zoom': String(zoom ?? 1),
    })
  }

  return { default: MockCropper }
})

class ReadyImage {
  naturalWidth = 3000
  naturalHeight = 4000
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  set src(_value: string) {
    this.onload?.()
  }
}

class BrokenImage {
  naturalWidth = 0
  naturalHeight = 0
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  set src(_value: string) {
    this.onerror?.()
  }
}

function installCanvas() {
  const drawImage = vi.fn()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () =>
      ({
        drawImage,
        imageSmoothingEnabled: false,
        imageSmoothingQuality: 'low',
      }) as unknown as CanvasRenderingContext2D,
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(
    (() => 'data:image/png;base64,AA==') as typeof HTMLCanvasElement.prototype.toDataURL,
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(((callback, type, quality) => {
    expect(type).toBe('image/jpeg')
    expect(quality).toBe(EXERCISE_PHOTO_EXPORT_QUALITY)
    callback(new Blob([new Uint8Array(40)], { type: 'image/jpeg' }))
  }) as typeof HTMLCanvasElement.prototype.toBlob)
  return { drawImage }
}

describe('exercise photo crop UI', () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear()
    vi.stubGlobal('Image', ReadyImage)
    installCanvas()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('uploads a cropped 4:3 file only after Готово', async () => {
    const onUpload = vi.fn()
    const { drawImage } = installCanvas()
    render(<ExercisePhotoSlots editable onUpload={onUpload} />)

    const original = new File([new Uint8Array(2 * 1024 * 1024)], 'IMG_2048.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getAllByLabelText('Загрузить фото')[0], { target: { files: [original] } })

    const dialog = await screen.findByRole('dialog', { name: 'Кадр старта' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByTestId('exercise-photo-cropper')).toBeInTheDocument()
    expect(onUpload).not.toHaveBeenCalled()

    const done = screen.getByRole('button', { name: 'Готово' })
    await waitFor(() => expect(done).toBeEnabled())
    fireEvent.click(done)

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1))
    const [position, uploaded] = onUpload.mock.calls[0] as [string, File]
    expect(position).toBe('start')
    expect(uploaded).not.toBe(original)
    expect(uploaded.name).toBe('start.jpg')
    expect(uploaded.type).toBe('image/jpeg')
    expect(uploaded.size).toBe(40)
    expect(uploaded.size).toBeLessThan(original.size)
    expect(drawImage).toHaveBeenCalledWith(expect.any(ReadyImage), 12, 24, 2400, 1800, 0, 0, 1600, 1200)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('resets zoom and leaves the original file unsent when cancelled', async () => {
    const onUpload = vi.fn()
    render(<ExercisePhotoSlots editable onUpload={onUpload} />)

    const original = new File([new Uint8Array(128)], 'end.png', { type: 'image/png' })
    fireEvent.change(screen.getAllByLabelText('Загрузить фото')[1], { target: { files: [original] } })

    expect(await screen.findByRole('dialog', { name: 'Кадр финиша' })).toBeInTheDocument()
    const slider = screen.getByRole('slider', { name: 'Масштаб' })
    fireEvent.change(slider, { target: { value: '2.4' } })
    expect(slider).toHaveValue('2.4')
    expect(screen.getByTestId('exercise-photo-cropper')).toHaveAttribute('data-zoom', '2.4')

    fireEvent.click(screen.getByRole('button', { name: 'Сбросить' }))
    expect(slider).toHaveValue('1')
    expect(screen.getByTestId('exercise-photo-cropper')).toHaveAttribute('data-zoom', '1')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onUpload).not.toHaveBeenCalled()
  })

  it('keeps the cropper open and does not upload when the photo cannot be read', async () => {
    vi.stubGlobal('Image', BrokenImage)
    const onUpload = vi.fn()
    render(<ExercisePhotoSlots editable onUpload={onUpload} />)

    fireEvent.change(screen.getAllByLabelText('Загрузить фото')[0], {
      target: { files: [new File([new Uint8Array(16)], 'start.jpg', { type: 'image/jpeg' })] },
    })
    const done = await screen.findByRole('button', { name: 'Готово' })
    await waitFor(() => expect(done).toBeEnabled())
    fireEvent.click(done)

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Не удалось обрезать фото. Попробуйте другой файл.'))
    expect(onUpload).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Кадр старта' })).toBeInTheDocument()
  })

  it('opens the cropper from the create-exercise photo field', async () => {
    const onFile = vi.fn()
    render(
      <CreateExercisePhotoField
        label="Финиш"
        inputId="create_photo_end"
        preview={null}
        disabled={false}
        onFile={onFile}
      />,
    )

    const original = new File([new Uint8Array(2 * 1024 * 1024)], 'finish.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Фото · Финиш'), { target: { files: [original] } })
    expect(onFile).not.toHaveBeenCalled()
    expect(await screen.findByRole('dialog', { name: 'Кадр финиша' })).toBeInTheDocument()

    const done = screen.getByRole('button', { name: 'Готово' })
    await waitFor(() => expect(done).toBeEnabled())
    fireEvent.click(done)

    await waitFor(() => expect(onFile).toHaveBeenCalledTimes(1))
    const file = onFile.mock.calls[0][0] as File
    expect(file).not.toBe(original)
    expect(file.name).toBe('end.jpg')
    expect(file.type).toBe('image/jpeg')
    expect(file.size).toBeLessThan(original.size)
  })
})
