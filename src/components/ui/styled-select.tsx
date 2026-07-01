import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'

import { cn } from '../../lib/utils'

export type StyledSelectOption = {
  value: string
  label: string
}

type StyledSelectProps = {
  id?: string
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  containerClassName?: string
  options: StyledSelectOption[]
}

export function StyledSelect({
  id,
  value,
  onChange,
  disabled,
  placeholder = 'Выберите...',
  className,
  containerClassName,
  options,
}: StyledSelectProps) {
  const normalizedValue = typeof value === 'string' ? value.trim().toLowerCase() : ''
  const selectedOption =
    options.find((option) => option.value === value) ??
    options.find((option) => option.value.trim().toLowerCase() === normalizedValue)
  const resolvedValue = selectedOption?.value

  return (
    <div className={cn('relative', containerClassName)}>
      <Select.Root value={resolvedValue} onValueChange={onChange} disabled={disabled}>
        <Select.Trigger
          id={id}
          aria-label={placeholder}
          className={cn(
            'h-10 w-full rounded-xl border border-border bg-background px-3 pr-10 text-left text-sm text-foreground outline-none transition',
            'hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/70 disabled:opacity-60',
            className,
          )}
        >
          <span className={cn('block truncate', !selectedOption ? 'text-secondary-foreground' : undefined)}>
            {selectedOption?.label ?? placeholder}
          </span>
          <Select.Icon asChild>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-foreground" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={8}
            className={cn(
              'z-30 w-[var(--radix-select-trigger-width)] origin-[var(--radix-select-content-transform-origin)] overflow-hidden rounded-xl border border-border bg-background',
              'shadow-[0_14px_34px_rgba(2,6,23,0.45)]',
              'data-[state=open]:opacity-100 data-[state=open]:scale-100 data-[state=closed]:opacity-0 data-[state=closed]:scale-95',
              'transition duration-150 ease-out',
            )}
          >
            <Select.Viewport className="max-h-56 p-1">
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    'relative flex cursor-default select-none items-center rounded-lg py-2 pl-3 pr-8 text-sm outline-none transition',
                    'text-secondary-foreground hover:bg-secondary focus:bg-secondary focus:text-foreground',
                    'data-[state=checked]:bg-primary/20 data-[state=checked]:text-foreground',
                  )}
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="absolute right-2 inline-flex items-center text-primary">
                    <Check size={14} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  )
}
