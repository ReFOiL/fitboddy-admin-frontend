import { cn } from '../../lib/utils'

const DIFFICULTY_LEVELS = [1, 2, 3, 4, 5] as const

type DifficultyPickerProps = {
  id?: string
  value: number
  onChange: (nextValue: number) => void
  disabled?: boolean
}

export function DifficultyPicker({ id, value, onChange, disabled = false }: DifficultyPickerProps) {
  return (
    <div id={id} className="grid gap-2">
      <div className="flex items-center gap-2">
        {DIFFICULTY_LEVELS.map((level) => {
          const selected = value === level
          return (
            <button
              key={level}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => {
                if (disabled || selected) return
                onChange(level)
              }}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:opacity-60',
                selected
                  ? 'border-primary/70 bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-secondary/30',
              )}
            >
              {level}
            </button>
          )
        })}
      </div>
      <div className="flex justify-between px-1 text-xs text-secondary-foreground">
        <span>Легко</span>
        <span>Сложно</span>
      </div>
    </div>
  )
}
