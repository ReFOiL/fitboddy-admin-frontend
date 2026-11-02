type HealthDataConsentFieldProps = {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  error?: string
}

export function HealthDataConsentField({ id, checked, onCheckedChange, error }: HealthDataConsentFieldProps) {
  const hintId = `${id}-hint`
  const errorId = error ? `${id}-error` : undefined
  const describedBy = errorId ? `${hintId} ${errorId}` : hintId

  return (
    <div className="rounded-2xl border border-border bg-secondary/40 p-3">
      <label className="flex items-start gap-3">
        <input
          id={id}
          name={id}
          type="checkbox"
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          checked={checked}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onChange={(event) => onCheckedChange(event.target.checked)}
        />
        <span className="grid gap-1">
          <span className="text-sm font-medium">Согласие на сведения о здоровье</span>
          <span id={hintId} className="text-xs leading-5 text-secondary-foreground">
            Я соглашаюсь на обработку ограничений и медицинских заметок и на показ этого текста тренеру, с которым я
            связан. Тренер увидит только то, что написано в этих двух полях. Без отметки текст не сохранится.
          </span>
        </span>
      </label>
      {error ? (
        <p id={errorId} className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
