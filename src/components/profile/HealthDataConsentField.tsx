import { HEALTH_DATA_CONSENT_LABEL } from '../../lib/health-data-consent'

type HealthDataConsentFieldProps = {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  error?: string
}

export function HealthDataConsentField({ id, checked, onCheckedChange, error }: HealthDataConsentFieldProps) {
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
        <span>{HEALTH_DATA_CONSENT_LABEL}</span>
      </label>
      {error ? (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
