import type { ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'

import { AlertBanner } from './AlertBanner'
import { EmptyState } from './EmptyState'
import { Button } from '../ui/button'

type QueryStateProps = {
  children: ReactNode
  isLoading?: boolean
  isError?: boolean
  isEmpty?: boolean
  loadingFallback?: ReactNode
  errorFallback?: ReactNode
  emptyFallback?: ReactNode
  errorTitle?: string
  errorDescription?: ReactNode
  retryLabel?: string
  onRetry?: () => void
}

export function QueryState({
  children,
  isLoading = false,
  isError = false,
  isEmpty = false,
  loadingFallback = <div className="py-6 text-sm text-secondary-foreground">Загрузка…</div>,
  errorFallback,
  emptyFallback = <EmptyState title="Здесь пока ничего нет" />,
  errorTitle = 'Не удалось загрузить данные',
  errorDescription,
  retryLabel = 'Повторить',
  onRetry,
}: QueryStateProps) {
  if (isLoading) return <div aria-busy="true" aria-live="polite">{loadingFallback}</div>
  if (isError) {
    return errorFallback ?? (
      <AlertBanner tone="destructive" title={errorTitle} role="alert">
        {errorDescription}
        {onRetry ? (
          <Button
            type="button"
            variant="secondary"
            className="mt-3 min-h-11 gap-2"
            onClick={onRetry}
          >
            <RotateCcw size={16} aria-hidden="true" />
            {retryLabel}
          </Button>
        ) : null}
      </AlertBanner>
    )
  }
  if (isEmpty) return emptyFallback
  return children
}
