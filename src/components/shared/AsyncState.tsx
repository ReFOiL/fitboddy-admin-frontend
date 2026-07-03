import type { ReactNode } from 'react'

type AsyncTextStateProps = {
  children: ReactNode
  tone?: 'default' | 'destructive'
}

export function AsyncTextState({ children, tone = 'default' }: AsyncTextStateProps) {
  return <span className={tone === 'destructive' ? 'text-sm text-destructive' : 'text-sm text-secondary-foreground'}>{children}</span>
}
