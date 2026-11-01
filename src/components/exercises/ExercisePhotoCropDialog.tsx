import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Cropper, { type Area, type MediaSize, type Point, type Size } from 'react-easy-crop'
import { toast } from 'sonner'

import {
  cropAndCompressExercisePhoto,
  EXERCISE_PHOTO_ASPECT,
  EXERCISE_PHOTO_CROP_FAILED_MESSAGE,
  EXERCISE_PHOTO_CROP_HINT,
  EXERCISE_PHOTO_CROP_MAX_ZOOM,
  EXERCISE_PHOTO_CROP_TITLES,
  EXERCISE_PHOTO_ZOOM_STEP,
  loadExercisePhoto,
  snapExercisePhotoZoom,
  type ExercisePhotoPixelCrop,
} from '../../lib/exercise-photo-crop'
import type { ExercisePhotoPosition } from '../../types/exercise'
import { Button } from '../ui/button'
import { type PendingExercisePhotoCrop } from './use-exercise-photo-crop'

type ExercisePhotoCropDialogProps = {
  imageUrl: string
  position: ExercisePhotoPosition
  onCancel: () => void
  onComplete: (file: File) => void
}

export function ExercisePhotoCropDialog({ imageUrl, position, onCancel, onComplete }: ExercisePhotoCropDialogProps) {
  const titleId = useId()
  const hintId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [minZoom, setMinZoom] = useState(1)
  const [cropPixels, setCropPixels] = useState<ExercisePhotoPixelCrop | null>(null)
  const [busy, setBusy] = useState(false)
  const title = EXERCISE_PHOTO_CROP_TITLES[position]
  const minZoomRef = useRef(1)
  const zoomRef = useRef(1)
  const mediaSizeRef = useRef<{ width: number; height: number } | null>(null)
  const maxZoom = Math.max(EXERCISE_PHOTO_CROP_MAX_ZOOM, minZoom)

  const commitZoom = (value: number) => {
    const next = Math.min(maxZoom, Math.max(minZoomRef.current, value))
    zoomRef.current = next
    setZoom(next)
  }

  const handleMediaSize = useCallback((size: MediaSize) => {
    mediaSizeRef.current = { width: size.width, height: size.height }
  }, [])

  const handleCropSize = useCallback((size: Size) => {
    const media = mediaSizeRef.current
    if (!media || media.width <= 0 || media.height <= 0 || size.width <= 0 || size.height <= 0) return
    const snap = snapExercisePhotoZoom(
      zoomRef.current,
      minZoomRef.current,
      media.width,
      media.height,
      size.width,
      size.height,
    )
    minZoomRef.current = snap.minZoom
    setMinZoom(snap.minZoom)
    if (Math.abs(zoomRef.current - snap.zoom) > 1e-4) {
      zoomRef.current = snap.zoom
      setZoom(snap.zoom)
    }
    if (snap.recenter) {
      setCrop((current) => (current.x === 0 && current.y === 0 ? current : { x: 0, y: 0 }))
    }
  }, [])

  const rememberCrop = useCallback((_area: Area, pixels: Area) => {
    setCropPixels((current) => {
      if (
        current &&
        current.x === pixels.x &&
        current.y === pixels.y &&
        current.width === pixels.width &&
        current.height === pixels.height
      ) {
        return current
      }
      return { x: pixels.x, y: pixels.y, width: pixels.width, height: pixels.height }
    })
  }, [])

  const reset = () => {
    setCrop({ x: 0, y: 0 })
    commitZoom(minZoomRef.current)
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || busy) return
      event.preventDefault()
      onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    dialogRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [busy, onCancel])

  const confirmCrop = async () => {
    if (!cropPixels || busy) return
    setBusy(true)
    try {
      const image = await loadExercisePhoto(imageUrl)
      const file = await cropAndCompressExercisePhoto(image, cropPixels, { position })
      onComplete(file)
    } catch {
      toast.error(EXERCISE_PHOTO_CROP_FAILED_MESSAGE)
      setBusy(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-media text-media-foreground md:items-center md:bg-overlay md:p-6"
      role="presentation"
      onClick={() => {
        if (!busy) onCancel()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={hintId}
        tabIndex={-1}
        className="flex h-full w-full flex-col bg-media text-media-foreground outline-none md:h-[min(760px,calc(100dvh-3rem))] md:max-w-lg md:overflow-hidden md:rounded-3xl md:border md:border-white/10"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="grid shrink-0 grid-cols-[auto_1fr_auto] items-center pt-[max(0.25rem,env(safe-area-inset-top))]">
          <button
            type="button"
            className="h-12 px-4 text-[17px] text-media-foreground disabled:opacity-50"
            onClick={onCancel}
            disabled={busy}
          >
            Отмена
          </button>
          <h2 id={titleId} className="truncate text-center text-[17px] font-semibold">
            {title}
          </h2>
          <span className="invisible h-12 px-4 text-[17px]" aria-hidden>
            Отмена
          </span>
        </header>

        <div className={`relative min-h-0 flex-1 ${busy ? 'pointer-events-none opacity-70' : ''}`}>
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            rotation={0}
            aspect={EXERCISE_PHOTO_ASPECT}
            minZoom={minZoom}
            maxZoom={maxZoom}
            cropShape="rect"
            objectFit="cover"
            showGrid={false}
            zoomSpeed={1}
            zoomWithScroll
            keyboardStep={1}
            restrictPosition
            onCropChange={setCrop}
            onZoomChange={commitZoom}
            setMediaSize={handleMediaSize}
            setCropSize={handleCropSize}
            onCropComplete={rememberCrop}
            onCropAreaChange={rememberCrop}
            style={{
              cropAreaStyle: {
                border: '2px solid #ffffff',
                borderRadius: 16,
                color: 'rgba(8, 10, 14, 0.55)',
              },
            }}
            classes={{}}
            mediaProps={{ alt: '' }}
            cropperProps={{ 'aria-label': 'Кадр 4:3' }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-media/75 px-3 py-1 text-[13px] font-semibold tracking-wide text-media-foreground"
          >
            4 : 3
          </span>
        </div>

        <div className="grid shrink-0 gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <p id={hintId} className="text-center text-[15px] leading-snug text-media-foreground/80">
            {EXERCISE_PHOTO_CROP_HINT}
          </p>
          <input
            type="range"
            className="photo-crop-zoom"
            min={minZoom}
            max={maxZoom}
            step={EXERCISE_PHOTO_ZOOM_STEP}
            value={zoom}
            aria-label="Масштаб"
            disabled={busy}
            onChange={(event) => {
              const next = Number(event.target.value)
              if (Number.isFinite(next)) commitZoom(next)
            }}
          />
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="secondary"
              className="border-transparent bg-white/10 text-media-foreground hover:bg-white/15"
              onClick={reset}
              disabled={busy}
            >
              Сбросить
            </Button>
            <Button type="button" onClick={() => void confirmCrop()} disabled={busy || cropPixels == null}>
              {busy ? 'Сохраняем…' : 'Готово'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function ExercisePhotoCropHost({
  pending,
  onCancel,
  onComplete,
}: {
  pending: PendingExercisePhotoCrop | null
  onCancel: () => void
  onComplete: (position: ExercisePhotoPosition, file: File) => void
}) {
  if (!pending) return null
  return (
    <ExercisePhotoCropDialog
      key={pending.url}
      imageUrl={pending.url}
      position={pending.position}
      onCancel={onCancel}
      onComplete={(file) => onComplete(pending.position, file)}
    />
  )
}
