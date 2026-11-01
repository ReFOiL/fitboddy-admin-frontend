import { Image, Loader2, Trash2 } from 'lucide-react'
import { useRef } from 'react'

import { MissingPhoto } from '../media/ExerciseMedia'
import { ExercisePhotoFrame } from '../media/ExercisePhotoFrame'

import {
  EXERCISE_PHOTO_ASPECT_HINT,
  EXERCISE_PHOTO_FRAME_CAPTIONS,
  EXERCISE_PHOTO_SHORT_LABELS,
} from '../../lib/exercise-photo-crop'
import {
  EXERCISE_PHOTO_ACCEPT,
  EXERCISE_PHOTO_HINT,
  EXERCISE_PHOTO_LABELS,
  EXERCISE_PHOTO_POSITIONS,
  type ExercisePhotoPosition,
  getExercisePhotoUrl,
  resolveExerciseMediaUrl,
} from '../../lib/exercise-photos'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { ExercisePhotoCropHost } from './ExercisePhotoCropDialog'
import { useExercisePhotoCrop } from './use-exercise-photo-crop'

const MAX_EXPIRED_PHOTO_REFRESHES = 2

type ExercisePhotoMedia = {
  start_image_url?: string | null
  end_image_url?: string | null
}

type ExercisePhotoSlotsProps = {
  startImageUrl?: string | null
  endImageUrl?: string | null
  exercise?: ExercisePhotoMedia | null
  editable?: boolean
  busyPosition?: ExercisePhotoPosition | null
  busyAction?: 'upload' | 'delete' | null
  uploadProgress?: number | null
  onUpload?: (position: ExercisePhotoPosition, file: File) => void
  onDelete?: (position: ExercisePhotoPosition) => void
  onImageError?: (position: ExercisePhotoPosition) => void
}

export function ExercisePhotoSlots({
  startImageUrl,
  endImageUrl,
  exercise,
  editable = false,
  busyPosition = null,
  busyAction = null,
  uploadProgress = null,
  onUpload,
  onDelete,
  onImageError,
}: ExercisePhotoSlotsProps) {
  const { pending, openCrop, closeCrop } = useExercisePhotoCrop()

  return (
    <div className="grid gap-3 rounded-xl border border-border/70 bg-secondary/20 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Image size={16} className="text-accent-ink" />
        Фото упражнения
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {EXERCISE_PHOTO_POSITIONS.map((position) => {
          const storedUrl =
            (position === 'start' ? startImageUrl : endImageUrl) ?? getExercisePhotoUrl(exercise, position)
          return (
            <ExercisePhotoSlot
              key={position}
              position={position}
              imageUrl={resolveExerciseMediaUrl(storedUrl)}
              editable={editable}
              isUploading={busyPosition === position && busyAction === 'upload'}
              isDeleting={busyPosition === position && busyAction === 'delete'}
              uploadProgress={uploadProgress}
              onPickFile={openCrop}
              onDelete={onDelete}
              onImageError={onImageError}
            />
          )
        })}
      </div>
      {editable ? <p className="text-xs text-secondary-foreground">{EXERCISE_PHOTO_ASPECT_HINT}</p> : null}
      <ExercisePhotoCropHost
        pending={pending}
        onCancel={closeCrop}
        onComplete={(position, file) => {
          onUpload?.(position, file)
          closeCrop()
        }}
      />
    </div>
  )
}

function ExercisePhotoSlot({
  position,
  imageUrl,
  editable,
  isUploading,
  isDeleting,
  uploadProgress,
  onPickFile,
  onDelete,
  onImageError,
}: {
  position: ExercisePhotoPosition
  imageUrl: string | null
  editable: boolean
  isUploading: boolean
  isDeleting: boolean
  uploadProgress: number | null
  onPickFile: (position: ExercisePhotoPosition, file: File) => void
  onDelete?: (position: ExercisePhotoPosition) => void
  onImageError?: (position: ExercisePhotoPosition) => void
}) {
  const label = EXERCISE_PHOTO_LABELS[position]
  const inputId = `exercise_photo_upload_${position}`
  const isBusy = isUploading || isDeleting
  const refreshAttemptsRef = useRef(0)
  const requestedForUrlRef = useRef<string | null>(null)

  const handleImageError = () => {
    if (!imageUrl || !onImageError) return
    // Один и тот же протухший URL не дёргаем повторно и не зацикливаем refetch.
    if (requestedForUrlRef.current === imageUrl) return
    if (refreshAttemptsRef.current >= MAX_EXPIRED_PHOTO_REFRESHES) return
    requestedForUrlRef.current = imageUrl
    refreshAttemptsRef.current += 1
    onImageError(position)
  }

  const handleImageLoad = () => {
    refreshAttemptsRef.current = 0
    requestedForUrlRef.current = null
  }

  return (
    <div className="relative grid gap-3 rounded-xl border border-border/70 bg-secondary/15 p-3">
      <div className="text-sm font-medium">{label}</div>

      {editable ? (
        <div className="grid gap-1.5">
          <Label htmlFor={inputId}>{imageUrl ? 'Заменить фото' : 'Загрузить фото'}</Label>
          <Input
            id={inputId}
            type="file"
            accept={EXERCISE_PHOTO_ACCEPT}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.currentTarget.value = ''
              if (!file) return
              // Кадр 4:3 собирается до загрузки: наружу уходит уже сжатый файл.
              onPickFile(position, file)
            }}
            disabled={isBusy}
          />
          <span className="text-xs text-secondary-foreground">{EXERCISE_PHOTO_HINT}</span>
        </div>
      ) : null}

      {isBusy ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          <Loader2 size={18} className="animate-spin text-accent-ink" />
          <div className="min-w-0 flex-1">
            <div className="font-medium">
              {isUploading ? formatUploadStatus(uploadProgress) : 'Удаляем фото...'}
            </div>
            <div className="text-xs text-secondary-foreground">
              {isUploading ? 'Не закрывайте страницу, пока файл не сохранится.' : 'Подождите немного.'}
            </div>
            {isUploading && uploadProgress != null ? (
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/20"
                role="progressbar"
                aria-valuenow={uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Прогресс загрузки фото"
              >
                <div className="h-full bg-primary" style={{ width: `${uploadProgress}%` }} />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {imageUrl ? (
        <div className={`space-y-3 ${isBusy ? 'pointer-events-none opacity-50' : ''}`}>
          <ExercisePhotoFrame
            key={imageUrl}
            src={imageUrl}
            alt={label}
            onError={handleImageError}
            onLoad={handleImageLoad}
            className="rounded-xl border border-border/60"
          >
            <span className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-media/80 px-2 py-0.5 text-[12px] font-semibold text-media-foreground">
              {EXERCISE_PHOTO_SHORT_LABELS[position]}
            </span>
          </ExercisePhotoFrame>
          <p className="text-center text-[13px] text-secondary-foreground">{EXERCISE_PHOTO_FRAME_CAPTIONS[position]}</p>
          {editable ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                if (!window.confirm(`Удалить фото «${label}»?`)) return
                onDelete?.(position)
              }}
              disabled={isBusy}
            >
              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              {isDeleting ? 'Удаление...' : 'Удалить фото'}
            </Button>
          ) : null}
        </div>
      ) : !isBusy ? (
        <div className="space-y-2">
          <MissingPhoto
            label={EXERCISE_PHOTO_SHORT_LABELS[position]}
            className="aspect-[4/3] w-full rounded-xl"
          />
          <p className="text-center text-[13px] text-secondary-foreground">{EXERCISE_PHOTO_FRAME_CAPTIONS[position]}</p>
        </div>
      ) : null}
    </div>
  )
}

function formatUploadStatus(uploadProgress: number | null): string {
  if (uploadProgress == null) return 'Загружаем фото...'
  return `Загружаем фото... ${uploadProgress}%`
}
