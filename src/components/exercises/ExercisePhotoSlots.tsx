import { Image, Loader2, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import { toast } from 'sonner'

import {
  EXERCISE_PHOTO_ACCEPT,
  EXERCISE_PHOTO_HINT,
  EXERCISE_PHOTO_LABELS,
  EXERCISE_PHOTO_POSITIONS,
  type ExercisePhotoPosition,
  getExercisePhotoUrl,
  resolveExerciseMediaUrl,
  validateExercisePhotoFile,
} from '../../lib/exercise-photos'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

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
  return (
    <div className="grid gap-3 rounded-xl border border-border/70 bg-secondary/20 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Image size={16} className="text-primary" />
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
              onUpload={onUpload}
              onDelete={onDelete}
              onImageError={onImageError}
            />
          )
        })}
      </div>
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
  onUpload,
  onDelete,
  onImageError,
}: {
  position: ExercisePhotoPosition
  imageUrl: string | null
  editable: boolean
  isUploading: boolean
  isDeleting: boolean
  uploadProgress: number | null
  onUpload?: (position: ExercisePhotoPosition, file: File) => void
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
              if (!file) return
              const validationError = validateExercisePhotoFile(file)
              if (validationError) {
                toast.error(validationError)
                event.currentTarget.value = ''
                return
              }
              onUpload?.(position, file)
              event.currentTarget.value = ''
            }}
            disabled={isBusy}
          />
          <span className="text-xs text-secondary-foreground">{EXERCISE_PHOTO_HINT}</span>
        </div>
      ) : null}

      {isBusy ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          <Loader2 size={18} className="animate-spin text-primary" />
          <div className="min-w-0 flex-1">
            <div className="font-medium">
              {isUploading ? formatUploadStatus(uploadProgress) : 'Удаляем фото...'}
            </div>
            <div className="text-xs text-secondary-foreground">
              {isUploading ? 'Не закрывай страницу, пока файл не сохранится.' : 'Подожди немного.'}
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
          <img
            key={imageUrl}
            src={imageUrl}
            alt={label}
            onError={handleImageError}
            onLoad={handleImageLoad}
            className="max-h-72 w-full rounded-xl border border-border/60 bg-background/40 object-contain"
          />
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
        <span className="text-sm text-secondary-foreground">
          {editable ? 'Фото ещё не загружено.' : 'Фото пока не загружено.'}
        </span>
      ) : null}
    </div>
  )
}

function formatUploadStatus(uploadProgress: number | null): string {
  if (uploadProgress == null) return 'Загружаем фото...'
  return `Загружаем фото... ${uploadProgress}%`
}
