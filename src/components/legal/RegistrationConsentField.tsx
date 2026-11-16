import type { ComponentProps, ReactNode } from 'react'

import { cn } from '../../lib/utils'

type RegistrationConsentFieldProps = Omit<ComponentProps<'input'>, 'type'> & {
  error?: string
  children: ReactNode
}

export function RegistrationConsentField({
  id = 'registration-consent',
  error,
  className,
  children,
  ...inputProps
}: RegistrationConsentFieldProps) {
  const errorId = `${id}-error`

  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
        <input
          {...inputProps}
          id={id}
          type="checkbox"
          className="mt-0.5 size-6 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? errorId : undefined}
        />
        <span className="text-sm leading-5 text-foreground">{children}</span>
      </label>
      {error ? (
        <span id={errorId} className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  )
}
