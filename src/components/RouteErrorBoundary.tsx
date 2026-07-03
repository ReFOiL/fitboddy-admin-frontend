import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'

import { APP_BRAND_NAME } from '../config/brand'

type RouteErrorBoundaryProps = {
  children: ReactNode
}

type RouteErrorBoundaryState = {
  hasError: boolean
}

export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error('Route rendering failed', error, errorInfo)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-dvh items-center justify-center px-4 text-center">
        <div className="space-y-2">
          <div className="text-lg font-semibold">{APP_BRAND_NAME}</div>
          <p className="text-sm text-secondary-foreground">Не удалось отрисовать страницу. Попробуйте обновить вкладку.</p>
        </div>
      </div>
    )
  }
}
