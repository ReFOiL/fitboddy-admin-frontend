import { cn } from '../../lib/utils'

type SkeletonProps = {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded-lg bg-secondary/70', className)} />
}

/** Заглушка страницы вместо текста «Загрузка страницы...». */
export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-lg space-y-4 py-6" aria-busy="true" aria-label="Загрузка страницы">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  )
}
