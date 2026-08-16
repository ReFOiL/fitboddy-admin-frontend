import { StyledSelect } from '../ui/styled-select'
import { ProfileFormField } from './ProfileFormField'

type SelectOption = { value: string; label: string }

type ProfileSelectFieldProps = {
  id: string
  label: string
  value: string | null
  onChange: (value: string | null) => void
  options: SelectOption[]
  placeholder: string
  error?: string
  disabled?: boolean
}

export function ProfileSelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled,
}: ProfileSelectFieldProps) {
  return (
    <ProfileFormField id={id} label={label} error={error}>
      <StyledSelect
        id={id}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
        placeholder={placeholder}
        value={value ?? undefined}
        options={options}
        onChange={(nextValue) => onChange(nextValue || null)}
        className={error ? 'border-destructive/60' : undefined}
        disabled={disabled}
      />
    </ProfileFormField>
  )
}
