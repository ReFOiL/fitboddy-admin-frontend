import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  canvasSupportsWebp,
  clampPixelCrop,
  cropAndCompressExercisePhoto,
  EXERCISE_PHOTO_ASPECT,
  EXERCISE_PHOTO_CROP_MAX_ZOOM,
  EXERCISE_PHOTO_EXPORT_MAX_EDGE,
  EXERCISE_PHOTO_EXPORT_QUALITY,
  exercisePhotoCoverZoom,
  exercisePhotoExportFileName,
  exercisePhotoExportSize,
  exercisePhotoPanLimit,
  exercisePhotoSliderZoom,
  snapExercisePhotoZoom,
} from '../src/lib/exercise-photo-crop'

const source = { width: 8, height: 8 } as CanvasImageSource

function installCanvas(options?: { webp?: boolean; blobs?: Array<{ type: string; size: number }> }) {
  const drawImage = vi.fn()
  const context = {
    drawImage,
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low',
  }
  const produced: Array<{ type?: string; quality?: number }> = []
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => context as unknown as CanvasRenderingContext2D,
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(((type?: string) => {
    if (options?.webp && type === 'image/webp') return 'data:image/webp;base64,AA=='
    return 'data:image/png;base64,AA=='
  }) as typeof HTMLCanvasElement.prototype.toDataURL)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(((callback, type, quality) => {
    produced.push({ type, quality })
    const scripted = options?.blobs?.[produced.length - 1]
    callback(new Blob([new Uint8Array(scripted?.size ?? 32)], { type: scripted?.type ?? type ?? 'image/jpeg' }))
  }) as typeof HTMLCanvasElement.prototype.toBlob)
  return { drawImage, context, produced }
}

describe('exercise photo crop', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps a locked 4:3 frame and caps the long edge', () => {
    expect(EXERCISE_PHOTO_ASPECT).toBeCloseTo(4 / 3)
    expect(EXERCISE_PHOTO_EXPORT_MAX_EDGE).toBe(1600)
    expect(EXERCISE_PHOTO_EXPORT_QUALITY).toBeCloseTo(0.8)

    expect(exercisePhotoExportSize(4000, 3000)).toEqual({ width: 1600, height: 1200 })
    expect(exercisePhotoExportSize(2400, 1800)).toEqual({ width: 1600, height: 1200 })
    expect(exercisePhotoExportSize(800, 600)).toEqual({ width: 800, height: 600 })
    expect(exercisePhotoExportSize(801, 601)).toEqual({ width: 800, height: 600 })
    expect(exercisePhotoExportSize(100, 75)).toEqual({ width: 100, height: 75 })
    expect(exercisePhotoExportSize(2, 2)).toEqual({ width: 4, height: 3 })
    expect(exercisePhotoExportSize(5000, 200, 800)).toEqual({ width: 800, height: 600 })

    for (const size of [exercisePhotoExportSize(4000, 3000), exercisePhotoExportSize(801, 100), exercisePhotoExportSize(90, 40)]) {
      expect(size.width / size.height).toBe(4 / 3)
      expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(EXERCISE_PHOTO_EXPORT_MAX_EDGE)
    }
  })

  it('rejects an empty crop', () => {
    expect(() => exercisePhotoExportSize(0, 1200)).toThrow('Некорректная область кадра.')
    expect(() => exercisePhotoExportSize(1200, Number.NaN)).toThrow('Некорректная область кадра.')
  })

  it('clamps the frame inside the source image', () => {
    expect(clampPixelCrop({ x: -20, y: 10, width: 500, height: 400 }, 300, 300)).toEqual({
      x: 0,
      y: 0,
      width: 300,
      height: 300,
    })
    expect(clampPixelCrop({ x: 180, y: 10, width: 50, height: 40 }, 200, 150)).toEqual({
      x: 150,
      y: 10,
      width: 50,
      height: 40,
    })
    expect(clampPixelCrop({ x: Number.NaN, y: 5, width: 10, height: 10 }, 100, 100)).toEqual({
      x: 0,
      y: 5,
      width: 10,
      height: 10,
    })
  })

  it('names jpeg and webp files from the photo position', () => {
    expect(exercisePhotoExportFileName('start', 'image/jpeg')).toBe('start.jpg')
    expect(exercisePhotoExportFileName('end', 'image/webp')).toBe('end.webp')
  })

  it('draws a 4:3 jpeg at quality 0.8 instead of keeping the source pixels', async () => {
    const { drawImage, context, produced } = installCanvas()
    const file = await cropAndCompressExercisePhoto(
      source,
      { x: 12, y: 24, width: 2400, height: 1800 },
      { position: 'start' },
    )

    expect(canvasSupportsWebp()).toBe(false)
    expect(drawImage).toHaveBeenCalledWith(source, 12, 24, 2400, 1800, 0, 0, 1600, 1200)
    expect(context.imageSmoothingEnabled).toBe(true)
    expect(context.imageSmoothingQuality).toBe('high')
    expect(produced).toEqual([{ type: 'image/jpeg', quality: EXERCISE_PHOTO_EXPORT_QUALITY }])
    expect(file.name).toBe('start.jpg')
    expect(file.type).toBe('image/jpeg')
    expect(file.size).toBe(32)
    expect(file.size).toBeLessThan(2400 * 1800)
  })

  it('uses the decoded image bounds and a caller-supplied long edge', async () => {
    const { drawImage, produced } = installCanvas()
    const image = new Image()
    Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 1000 })
    Object.defineProperty(image, 'naturalHeight', { configurable: true, value: 800 })

    const file = await cropAndCompressExercisePhoto(
      image,
      { x: -10, y: 20, width: 5000, height: 600 },
      { position: 'end', quality: 0.5, maxEdge: 800 },
    )

    expect(drawImage).toHaveBeenCalledWith(image, 0, 20, 1000, 600, 0, 0, 800, 600)
    expect(produced).toEqual([{ type: 'image/jpeg', quality: 0.5 }])
    expect(file.name).toBe('end.jpg')
    expect(file.type).toBe('image/jpeg')
  })

  it('prefers webp when the canvas encodes it', async () => {
    installCanvas({ webp: true })
    const file = await cropAndCompressExercisePhoto(source, { x: 0, y: 0, width: 800, height: 600 }, { position: 'end' })
    expect(file.name).toBe('end.webp')
    expect(file.type).toBe('image/webp')
    expect(file.size).toBe(32)
  })

  it('falls back to jpeg when a webp blob is not actually webp', async () => {
    const { produced } = installCanvas({
      webp: true,
      blobs: [
        { type: 'image/png', size: 10 },
        { type: 'image/jpeg', size: 20 },
      ],
    })
    const file = await cropAndCompressExercisePhoto(source, { x: 0, y: 0, width: 400, height: 300 }, { position: 'start' })
    expect(produced.map((item) => item.type)).toEqual(['image/webp', 'image/jpeg'])
    expect(file.name).toBe('start.jpg')
    expect(file.type).toBe('image/jpeg')
    expect(file.size).toBe(20)
  })

  it('covers the 4:3 frame and locks the short axis at the minimum zoom', () => {
    // Высокий диалог, широкое фото после object-fit: cover. Рамка 4:3 на всю ширину
    // контейнера и ниже снимка — при zoom 1 его можно двигать и по вертикали.
    const media = { width: 800, height: 500 }
    const crop = { width: 400, height: 300 }
    const cover = exercisePhotoCoverZoom(media.width, media.height, crop.width, crop.height)
    expect(cover).toBeCloseTo(0.6)

    const free = exercisePhotoPanLimit(media.width, media.height, crop.width, crop.height, 1)
    expect(free.x).toBeGreaterThan(20)
    expect(free.y).toBeGreaterThan(20)

    const locked = exercisePhotoPanLimit(media.width, media.height, crop.width, crop.height, cover)
    expect(locked.y).toBeCloseTo(0)
    expect(locked.x).toBeGreaterThan(20)

    const opened = snapExercisePhotoZoom(1, 1, media.width, media.height, crop.width, crop.height)
    expect(opened.minZoom).toBeCloseTo(cover)
    expect(opened.zoom).toBeCloseTo(cover)
    expect(opened.recenter).toBe(true)
    expect(opened.maxZoom).toBe(EXERCISE_PHOTO_CROP_MAX_ZOOM)

    const zoomed = snapExercisePhotoZoom(2, cover, media.width, media.height, crop.width, crop.height)
    expect(zoomed.zoom).toBe(2)
    expect(zoomed.recenter).toBe(false)
    const zoomedPan = exercisePhotoPanLimit(media.width, media.height, crop.width, crop.height, zoomed.zoom)
    expect(zoomedPan.x).toBeGreaterThan(0)
    expect(zoomedPan.y).toBeGreaterThan(0)
  })

  it('lets a portrait photo pan only vertically and a 4:3 photo not at all', () => {
    const portraitZoom = exercisePhotoCoverZoom(300, 800, 300, 225)
    expect(portraitZoom).toBeCloseTo(1)
    const portraitPan = exercisePhotoPanLimit(300, 800, 300, 225, portraitZoom)
    expect(portraitPan.x).toBeCloseTo(0)
    expect(portraitPan.y).toBeGreaterThan(20)

    const squareZoom = exercisePhotoCoverZoom(800, 600, 800, 600)
    expect(squareZoom).toBeCloseTo(1)
    const squarePan = exercisePhotoPanLimit(800, 600, 800, 600, squareZoom)
    expect(squarePan.x).toBeCloseTo(0)
    expect(squarePan.y).toBeCloseTo(0)

    // Исходник ровно 4:3, но cover контейнера рисует его крупнее рамки.
    const fitted = exercisePhotoCoverZoom(800, 600, 400, 300)
    expect(fitted).toBeCloseTo(0.5)
    const fittedPan = exercisePhotoPanLimit(800, 600, 400, 300, fitted)
    expect(fittedPan.x).toBeCloseTo(0)
    expect(fittedPan.y).toBeCloseTo(0)
  })

  it('keeps the crop covered for every source aspect at the cover zoom', () => {
    const crop = { width: 400, height: 300 }
    const sources = [
      [1600, 900],
      [960, 600],
      [800, 800],
      [600, 960],
      [400, 300],
      [300, 400],
      [100, 1000],
      [1000, 100],
    ]
    for (const [mediaWidth, mediaHeight] of sources) {
      const zoom = exercisePhotoCoverZoom(mediaWidth, mediaHeight, crop.width, crop.height)
      const overflowX = mediaWidth * zoom - crop.width
      const overflowY = mediaHeight * zoom - crop.height
      expect(overflowX).toBeGreaterThanOrEqual(-1e-4)
      expect(overflowY).toBeGreaterThanOrEqual(-1e-4)
      expect(Math.min(overflowX, overflowY)).toBeCloseTo(0, 5)
      const gapZoom = zoom * 0.95
      const gap = Math.min(mediaWidth * gapZoom - crop.width, mediaHeight * gapZoom - crop.height)
      expect(gap).toBeLessThan(-1)
    }
  })

  it('follows a new cover zoom when the frame is still at the minimum', () => {
    const raised = snapExercisePhotoZoom(0.6, 0.6, 800, 500, 400, 360)
    expect(raised.zoom).toBeCloseTo(360 / 500)
    expect(raised.recenter).toBe(true)

    const clamped = snapExercisePhotoZoom(5, 0.6, 800, 500, 400, 300)
    expect(clamped.zoom).toBe(EXERCISE_PHOTO_CROP_MAX_ZOOM)
    expect(clamped.recenter).toBe(false)

    expect(exercisePhotoCoverZoom(0, 500, 400, 300)).toBe(1)
    expect(exercisePhotoCoverZoom(Number.NaN, 500, 400, 300)).toBe(1)
    expect(exercisePhotoPanLimit(Number.NaN, 500, 400, 300, 1)).toEqual({ x: 0, y: 100 })
    expect(exercisePhotoSliderZoom(0.7402031930333817)).toBe(0.741)
    expect(exercisePhotoSliderZoom(0.6)).toBe(0.6)
    const snapped = exercisePhotoSliderZoom(0.4787234042553192)
    expect(snapped).toBe(0.479)
    const extra = 500 * snapped - 500 * 0.4787234042553192
    expect(extra).toBeGreaterThan(0)
    expect(extra).toBeLessThan(1)
  })

  it('fails clearly when the canvas context is missing', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    await expect(
      cropAndCompressExercisePhoto(source, { x: 0, y: 0, width: 400, height: 300 }, { position: 'start' }),
    ).rejects.toThrow('Не удалось подготовить кадр.')
  })
})
