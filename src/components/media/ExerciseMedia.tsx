import { photoPlaceholderForTheme, VIDEO_PLACEHOLDER_SRC } from '../../lib/media-placeholders'
import { resolveExerciseMediaUrl } from '../../lib/exercise-photos'
import { useTheme } from '../../hooks/use-theme'
import { cn } from '../../lib/utils'

type FrameProps = {
  label?: string
  className?: string
}

/** Пустое фото положения. Подпись рисует интерфейс, не картинка. */
export function MissingPhoto({ label, className }: FrameProps) {
  const { theme } = useTheme()
  return (
    <span className={cn('relative block overflow-hidden bg-secondary', className)}>
      <img src={photoPlaceholderForTheme(theme)} alt="" className="h-full w-full object-cover" />
      {label ? (
        <span className="absolute inset-x-0 bottom-0 bg-background/80 px-2 py-1 text-center text-[13px] font-semibold text-foreground">
          {label}
        </span>
      ) : null}
    </span>
  )
}

/** Нет ролика: картинка-заглушка вместо чёрного прямоугольника «Видео». */
export function MissingVideo({ label, className }: FrameProps) {
  return (
    <span className={cn('relative block overflow-hidden bg-secondary', className)}>
      <img src={VIDEO_PLACEHOLDER_SRC} alt="" className="h-full w-full object-cover" />
      {label ? (
        <span className="absolute inset-x-0 bottom-0 bg-background/80 px-2 py-1 text-center text-[13px] font-semibold text-foreground">
          {label}
        </span>
      ) : null}
    </span>
  )
}

type HeroProps = {
  videoUrl?: string | null
  startUrl?: string | null
  endUrl?: string | null
  className?: string
}

/**
 * Один кадр тренировки: ролик, если он есть, иначе фото старта/финиша.
 * Пустые стороны подписаны в интерфейсе. Чёрный блок «Видео» не показываем.
 */
export function ExerciseHeroMedia({ videoUrl, startUrl, endUrl, className }: HeroProps) {
  const video = resolveExerciseMediaUrl(videoUrl)
  const start = resolveExerciseMediaUrl(startUrl)
  const end = resolveExerciseMediaUrl(endUrl)

  if (video) {
    return (
      <video
        key={video}
        src={video}
        controls
        className={cn('aspect-video w-full rounded-2xl bg-card object-contain', className)}
      />
    )
  }

  if (!start && !end) {
    return <MissingPhoto label="Фото положения" className={cn('aspect-[4/5] w-full rounded-2xl', className)} />
  }

  if (start && end) {
    return (
      <div className={cn('grid grid-cols-2 gap-2', className)}>
        <img src={start} alt="Старт" className="aspect-[4/5] w-full rounded-2xl object-cover" />
        <img src={end} alt="Финиш" className="aspect-[4/5] w-full rounded-2xl object-cover" />
      </div>
    )
  }

  const photo = start ?? end
  const missingLabel = start ? 'Финиш' : 'Старт'
  return (
    <div className={className}>
      <img src={photo ?? ''} alt={start ? 'Старт' : 'Финиш'} className="aspect-[4/5] w-full rounded-2xl object-cover" />
      <p className="mt-2 text-[15px] text-secondary-foreground">Нет фото: {missingLabel}</p>
    </div>
  )
}

type SlotPreviewProps = {
  startUrl?: string | null
  endUrl?: string | null
  className?: string
}

/** Одно превью в карточке слота. Подписи «Старт» и «Финиш» только у отсутствующих кадров. */
export function SlotPhotoPreview({ startUrl, endUrl, className }: SlotPreviewProps) {
  const start = resolveExerciseMediaUrl(startUrl)
  const end = resolveExerciseMediaUrl(endUrl)
  const preview = start ?? end
  const missing = [start ? null : 'Старт', end ? null : 'Финиш'].filter((item): item is string => Boolean(item))

  if (!preview) {
    return <MissingPhoto label={missing.join(' · ')} className={cn('aspect-[4/3] w-full rounded-2xl', className)} />
  }

  return (
    <div className={className}>
      <img src={preview} alt="" className="aspect-[4/3] w-full rounded-2xl object-cover" />
      {missing.length > 0 ? <p className="mt-2 text-[15px] font-semibold">Нет фото: {missing.join(' · ')}</p> : null}
    </div>
  )
}
