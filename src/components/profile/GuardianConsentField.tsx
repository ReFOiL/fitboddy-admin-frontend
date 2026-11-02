import { APP_PATHS } from '../../config'
import { LegalDocLink } from '../legal/LegalDocumentLinks'

type GuardianConsentFieldProps = {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  error?: string
}

export function GuardianConsentField({ id, checked, onCheckedChange, error }: GuardianConsentFieldProps) {
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="grid gap-1">
      <label className="flex items-start gap-2.5 text-[15px] leading-5 text-secondary-foreground">
        <input
          id={id}
          name={id}
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          checked={checked}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          onChange={(event) => onCheckedChange(event.target.checked)}
        />
        <span>
          Законный представитель подтверждает согласие на использование сервиса несовершеннолетним и на{' '}
          <LegalDocLink to={APP_PATHS.privacy}>обработку данных ребёнка</LegalDocLink>
          {' по '}
          <LegalDocLink to={APP_PATHS.terms}>пользовательскому соглашению</LegalDocLink>
        </span>
      </label>
      {error ? (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
