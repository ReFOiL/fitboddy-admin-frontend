import { ExercisePhotoFrame } from '../media/ExercisePhotoFrame'
import { StyledUpload } from '../media/StyledUpload'
import { EXERCISE_PHOTO_ACCEPT } from '../../lib/exercise-photos'
import type { ExercisePhotoPosition } from '../../types/exercise'
import { ExercisePhotoCropHost } from './ExercisePhotoCropDialog'
import { useExercisePhotoCrop } from './use-exercise-photo-crop'

const POSITIONS = {
  Старт: 'start',
  Финиш: 'end',
} as const satisfies Record<string, ExercisePhotoPosition>

type CreateExercisePhotoFieldProps = {
  label: keyof typeof POSITIONS
  inputId: string
  preview: string | null
  disabled: boolean
  onFile: (file: File | null) => void
}

export function CreateExercisePhotoField({ label, inputId, preview, disabled, onFile }: CreateExercisePhotoFieldProps) {
  const position = POSITIONS[label]
  const { pending, openCrop, closeCrop } = useExercisePhotoCrop()

  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">Фото · {label}</p>
      {preview ? <ExercisePhotoFrame src={preview} alt="" /> : null}
      <StyledUpload
        kind="photo"
        id={inputId}
        accept={EXERCISE_PHOTO_ACCEPT}
        disabled={disabled}
        hasPreview={Boolean(preview)}
        emptyCaption={label}
        onFile={(file) => {
          openCrop(position, file)
        }}
      />
      <ExercisePhotoCropHost
        pending={pending}
        onCancel={closeCrop}
        onComplete={(_position, file) => {
          onFile(file)
          closeCrop()
        }}
      />
    </div>
  )
}
