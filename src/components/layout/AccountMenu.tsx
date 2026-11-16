import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { APP_PATHS } from '../../config'
import { firstName } from '../../lib/person'
import { cn } from '../../lib/utils'
import { ThemeToggle } from './ThemeToggle'

type AccountMenuProps = {
  name: string
  logoutPending: boolean
  onLogout: () => void
}

// Меню клиента: у тренера те же пункты живут на экране «Ещё», а не под именем.
export function AccountMenu({ name, logoutPending, onLogout }: AccountMenuProps) {
  const [open, setOpen] = useState(false)
  const label = firstName(name) || 'Аккаунт'

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className={cn('relative', open && 'z-50')}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative z-50 flex h-12 items-center gap-1 text-[15px] font-semibold"
        onClick={() => setOpen((current) => !current)}
      >
        {label}
        <ChevronDown size={16} aria-hidden />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" role="presentation" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
          >
            <Link role="menuitem" className="flex min-h-12 items-center border-b border-border px-4 text-[17px]" to={APP_PATHS.profile} onClick={() => setOpen(false)}>
              Профиль
            </Link>
            <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4">
              <span className="text-[17px]">Тема</span>
              <ThemeToggle />
            </div>
            <Link role="menuitem" className="flex min-h-12 items-center border-b border-border px-4 text-[17px]" to={APP_PATHS.trainers} onClick={() => setOpen(false)}>
              Тренер
            </Link>
            <button
              type="button"
              role="menuitem"
              className="flex min-h-12 w-full items-center px-4 text-left text-[17px] text-destructive"
              disabled={logoutPending}
              onClick={onLogout}
            >
              {logoutPending ? 'Выходим…' : 'Выйти'}
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
