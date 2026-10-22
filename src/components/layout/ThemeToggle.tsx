import { Moon, Sun } from 'lucide-react'

import { useTheme } from '../../hooks/use-theme'
import { cn } from '../../lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  const label = dark ? 'Включить светлую тему' : 'Включить тёмную тему'

  return (
    <button
      type="button"
      aria-pressed={dark}
      aria-label={label}
      title={label}
      onClick={toggleTheme}
      className={cn(
        'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
        className,
      )}
    >
      {dark ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
    </button>
  )
}
