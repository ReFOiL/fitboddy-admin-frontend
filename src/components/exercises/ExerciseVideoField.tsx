import { Loader2, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useTheme } from '../../hooks/use-theme'
import { resolveExerciseMediaUrl } from '../../lib/exercise-photos'
import { formatUploadFileSize } from '../media/format-upload-size'
import { StyledUpload } from '../media/StyledUpload'
import { Button } from '../ui/button'

const VIDEO_ACCEPT = '.mp4,.mov,video/mp4,video/quicktime'
const VIDEO_HINT = 'Поддерживаются MP4/MOV, до 200MB.'

type ExerciseVideoFieldProps = {
  videoUrl?: string | null
  action: 'upload' | 'delete' | null
  progress: number | null
  onUpload: (file: File) => void
  onDelete: () => void
}

export function ExerciseVideoField({ videoUrl, action, progress, onUpload, onDelete }: ExerciseVideoFieldProps) {
  const busy = action != null
  const { theme } = useTheme()
  const [selected, setSelected] = useState<File | null>(null)
  const wasBusy = useRef(false)
  const playbackUrl = resolveExerciseMediaUrl(videoUrl)

  useEffect(() => {
    if (wasBusy.current && !busy) setSelected(null)
    wasBusy.current = busy
  }, [busy])

  const compactEmpty = !playbackUrl && !selected && !busy

  return (
    <div className="grid gap-3">
      <StyledUpload
        kind="video"
        id="exercise_video_upload"
        accept={VIDEO_ACCEPT}
        disabled={busy}
        compactEmpty={compactEmpty}
        fileName={selected?.name ?? null}
        fileSizeLabel={selected ? formatUploadFileSize(selected.size) : null}
        progress={busy ? progress : null}
        onFile={(file) => {
          setSelected(file)
          onUpload(file)
        }}
      />
      <p className="text-xs text-secondary-foreground">{VIDEO_HINT}</p>
      {action === 'upload' ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          <Loader2 size={18} className="animate-spin text-accent-ink" />
          <div>
            <div className="font-medium">{progress != null ? `Загружаем видео... ${progress}%` : 'Загружаем видео...'}</div>
            <div className="text-xs text-secondary-foreground">
              Большие файлы могут загружаться до нескольких минут. Не закрывайте страницу.
            </div>
          </div>
        </div>
      ) : null}
      {action === 'delete' ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          <Loader2 size={18} className="animate-spin text-accent-ink" />
          <div>
            <div className="font-medium">Удаляем видео...</div>
            <div className="text-xs text-secondary-foreground">Подождите немного.</div>
          </div>
        </div>
      ) : null}
      {playbackUrl ? (
        <div className={`space-y-3 ${busy ? 'pointer-events-none opacity-50' : ''}`}>
          <video
            key={playbackUrl}
            src={playbackUrl}
            controls
            className="max-h-72 w-full rounded-xl border border-border bg-media object-contain"
            style={{ colorScheme: theme }}
          />
          <Button type="button" variant="secondary" size="sm" onClick={onDelete} disabled={busy}>
            {action === 'delete' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {action === 'delete' ? 'Удаление...' : 'Удалить видео'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
