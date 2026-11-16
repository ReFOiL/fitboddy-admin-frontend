import { ImagePlus, UserRound } from 'lucide-react'

import { cn } from '../../lib/utils'

type UploadCommon = {
  id: string
  accept: string
  disabled?: boolean
  describedBy?: string
  onFile: (file: File) => void
}

export type StyledUploadProps =
  | (UploadCommon & {
      kind: 'photo'
      hasPreview: boolean
      /** Подпись положения на пустой рамке, отдельно от имени кнопки. */
      emptyCaption?: string
      emptyLabel?: string
      replaceLabel?: string
    })
  | (UploadCommon & {
      kind: 'video'
      /** Пустое состояние одной строкой, без большой заглушки. */
      compactEmpty?: boolean
      fileName?: string | null
      fileSizeLabel?: string | null
      progress?: number | null
    })
  | (UploadCommon & {
      kind: 'avatar'
      previewUrl?: string | null
    })

/**
 * Скрытый input и своя кнопка вместо системного «Choose File / No file chosen».
 * Подпись через label, чтобы выбор файла оставался клавиатурным.
 */
export function StyledUpload(props: StyledUploadProps) {
  switch (props.kind) {
    case 'photo':
      return <PhotoUpload {...props} />
    case 'video':
      return <VideoUpload {...props} />
    case 'avatar':
      return <AvatarUpload {...props} />
    default: {
      const unexpected: never = props
      return unexpected
    }
  }
}

function HiddenFileInput({ id, accept, disabled, describedBy, onFile }: UploadCommon) {
  return (
    <input
      id={id}
      type="file"
      accept={accept}
      disabled={disabled}
      aria-describedby={describedBy}
      className="peer sr-only"
      onChange={(event) => {
        const file = event.target.files?.[0]
        // Пустое value позволяет выбрать тот же файл ещё раз после отмены.
        event.currentTarget.value = ''
        if (!file) return
        onFile(file)
      }}
    />
  )
}

const focusRing = 'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-focus'
const disabledLook = 'peer-disabled:cursor-not-allowed peer-disabled:opacity-50'

function PhotoUpload({
  id,
  accept,
  disabled,
  describedBy,
  onFile,
  hasPreview,
  emptyCaption,
  emptyLabel = 'Загрузить фото',
  replaceLabel = 'Заменить фото',
}: Extract<StyledUploadProps, { kind: 'photo' }>) {
  return (
    <div className="relative grid gap-2">
      <HiddenFileInput id={id} accept={accept} disabled={disabled} describedBy={describedBy} onFile={onFile} />
      {hasPreview ? (
        <label
          htmlFor={id}
          className={cn(
            'inline-flex h-12 cursor-pointer items-center justify-center rounded-2xl border border-border bg-card px-4 text-[15px] font-semibold text-foreground',
            focusRing,
            disabledLook,
          )}
        >
          {replaceLabel}
        </label>
      ) : (
        <label
          htmlFor={id}
          className={cn(
            'flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/45 bg-secondary px-4 text-center text-[15px] font-semibold text-foreground',
            focusRing,
            disabledLook,
          )}
        >
          <ImagePlus size={22} className="text-accent-ink" aria-hidden />
          {emptyLabel}
        </label>
      )}
      {!hasPreview && emptyCaption ? (
        <span className="pointer-events-none absolute inset-x-3 bottom-3 text-center text-[13px] font-semibold text-secondary-foreground">
          {emptyCaption}
        </span>
      ) : null}
    </div>
  )
}

function VideoUpload({
  id,
  accept,
  disabled,
  describedBy,
  onFile,
  compactEmpty = false,
  fileName,
  fileSizeLabel,
  progress = null,
}: Extract<StyledUploadProps, { kind: 'video' }>) {
  return (
    <div className="grid gap-2">
      <HiddenFileInput id={id} accept={accept} disabled={disabled} describedBy={describedBy} onFile={onFile} />
      {compactEmpty ? (
        <p className="text-[15px] text-secondary-foreground">
          Видео не загружено
          {' · '}
          <label
            htmlFor={id}
            className={cn('cursor-pointer font-semibold text-accent-ink underline-offset-2 hover:underline', focusRing, disabledLook)}
          >
            Загрузить
          </label>
        </p>
      ) : (
        <label
          htmlFor={id}
          className={cn(
            'inline-flex h-12 cursor-pointer items-center justify-center rounded-2xl border border-border bg-card px-4 text-[15px] font-semibold text-foreground',
            focusRing,
            disabledLook,
          )}
        >
          Загрузить видео
        </label>
      )}
      {fileName ? (
        <p className="truncate text-[15px] text-foreground">
          <span>{fileName}</span>
          {fileSizeLabel ? <span className="text-secondary-foreground"> · {fileSizeLabel}</span> : null}
        </p>
      ) : null}
      {progress != null ? (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-primary/20"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Прогресс загрузки видео"
        >
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
    </div>
  )
}

function AvatarUpload({
  id,
  accept,
  disabled,
  describedBy,
  onFile,
  previewUrl,
}: Extract<StyledUploadProps, { kind: 'avatar' }>) {
  const src = previewUrl?.trim() ? previewUrl : null
  return (
    <div className="flex items-center gap-4">
      <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary ring-2 ring-primary/30">
        {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <UserRound className="text-accent-ink" aria-hidden />}
      </span>
      <HiddenFileInput id={id} accept={accept} disabled={disabled} describedBy={describedBy} onFile={onFile} />
      <label
        htmlFor={id}
        className={cn(
          'inline-flex h-12 cursor-pointer items-center justify-center rounded-2xl border border-border bg-card px-4 text-[15px] font-semibold text-foreground',
          focusRing,
          disabledLook,
        )}
      >
        Изменить
      </label>
    </div>
  )
}
