import type { ReactNode } from 'react'

import { cn } from '../../lib/utils'

type ExercisePhotoFrameProps = {
  src: string
  alt: string
  className?: string
  onError?: () => void
  onLoad?: () => void
  children?: ReactNode
}

/**
 * Фиксированный кадр 4:3. Уже сохранённые фото не перекодируем:
 * лишнее закрывает object-fit: cover по центру.
 */
export function ExercisePhotoFrame({ src, alt, className, onError, onLoad, children }: ExercisePhotoFrameProps) {
  return (
    <span
      data-aspect="4/3"
      className={cn('relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-secondary', className)}
    >
      <img
        src={src}
        alt={alt}
        onError={onError}
        onLoad={onLoad}
        className="h-full w-full object-cover object-center"
      />
      {children}
    </span>
  )
}
