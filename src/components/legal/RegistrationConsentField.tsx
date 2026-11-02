import type { ComponentProps } from 'react'

import { APP_PATHS } from '../../config'
import { cn } from '../../lib/utils'
import { LegalDocLink } from './LegalDocumentLinks'

type RegistrationConsentFieldProps = Omit<ComponentProps<'input'>, 'type'> & {
  error?: string
}

export function RegistrationConsentField({
  id = 'registration-consent',
  error,
  className,
  ...inputProps
}: RegistrationConsentFieldProps) {
  const errorId = `${id}-error`

  return (
    <div className={cn('grid gap-1.5', className)}>
      <div className="flex items-start gap-3">
        <input
          {...inputProps}
          id={id}
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? errorId : undefined}
        />
        <label htmlFor={id} className="text-sm leading-5 text-foreground">
          Я соглашаюсь с{' '}
          <LegalDocLink to={APP_PATHS.privacy}>политикой обработки персональных данных</LegalDocLink>
          {' '}и принимаю{' '}
          <LegalDocLink to={APP_PATHS.terms}>пользовательское соглашение</LegalDocLink>
          .
        </label>
      </div>
      {error ? (
        <span id={errorId} className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  )
}
