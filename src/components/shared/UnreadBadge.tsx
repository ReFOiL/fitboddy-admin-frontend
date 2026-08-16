import type { HTMLAttributes } from 'react'

import { cn } from '../../lib/utils'

type UnreadBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  count: number
  max?: number
}

export function UnreadBadge({ count, max = 99, className, ...props }: UnreadBadgeProps) {
  if (count <= 0) return null

  const label = count > max ? `${max}+` : String(count)

  return (
    <span
      aria-label={`${count} непрочитанных`}
      className={cn(
        'inline-flex min-w-4 items-center justify-center rounded-full bg-info px-1 text-[10px] font-semibold leading-4 text-background',
        className,
      )}
      {...props}
    >
      {label}
    </span>
  )
}
