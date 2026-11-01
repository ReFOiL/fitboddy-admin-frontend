import { MissingPhoto } from '../media/ExerciseMedia'
import { ExercisePhotoFrame } from '../media/ExercisePhotoFrame'
import { EXERCISE_PHOTO_ACCEPT } from '../../lib/exercise-photos'
import type { ExercisePhotoPosition } from '../../types/exercise'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
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
      <Label htmlFor={inputId}>Фото · {label}</Label>
      {preview ? (
        <ExercisePhotoFrame src={preview} alt="" />
      ) : (
        <MissingPhoto label={label} className="aspect-[4/3] w-full rounded-2xl" />
      )}
      <Input
        id={inputId}
        type="file"
        accept={EXERCISE_PHOTO_ACCEPT}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null
          event.currentTarget.value = ''
          if (!file) {
            onFile(null)
            return
          }
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
