import type { ReactNode } from 'react'

import { Label } from '../ui/label'

type ProfileFormFieldProps = {
  id: string
  label: string
  error?: string
  hint?: string
  children: ReactNode
}

export function ProfileFormField({ id, label, error, hint, children }: ProfileFormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? (
        <span id={hintId} className="text-xs text-secondary-foreground">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}
